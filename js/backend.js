// Komunikácia so Supabase (prihlásenie, obľúbené, recepty, zdieľanie, fotky, účet).
// Stránka volá len funkcie z window.Backend – ak Supabase nie je nastavený
// (chýba js/supabase-config.js), Backend.configured = false a web funguje ako doteraz.
(function () {
  // Pri testoch sa dá podstrčiť falošný backend (pozri testy), inak skutočný.
  if (window.PEKARI_TEST_BACKEND) { window.Backend = window.PEKARI_TEST_BACKEND; return; }

  const cfg = window.PEKARI_CONFIG || {};
  const configured = !!(cfg.supabaseUrl && cfg.supabaseKey && window.supabase);
  const BUCKET = "recipe-photos";
  const REDIRECT_KEY = "pekari-po-prihlaseni";

  if (!configured) {
    window.Backend = { configured: false };
    return;
  }

  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });

  let user = null; // { id, email, publicName, isAdmin }

  function fail(error) {
    if (!error) return;
    const e = new Error(error.message || "Chyba spojenia s databázou");
    e.code = error.code;
    throw e;
  }

  async function loadUser(session) {
    if (!session) { user = null; return null; }
    const u = session.user;
    let { data: profile, error } = await sb.from("profiles").select("public_name").eq("id", u.id).maybeSingle();
    if (!error && !profile) {
      // profil chýba (napr. prihlásenie pred spustením schema.sql) – vytvoríme ho
      await sb.from("profiles").insert({ id: u.id });
      profile = { public_name: null };
    }
    const { data: isAdmin } = await sb.rpc("is_admin");
    user = { id: u.id, email: u.email, publicName: profile ? profile.public_name : null, isAdmin: !!isAdmin };
    return user;
  }

  function photoUrl(path) {
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  // riadok z databázy -> recept v rovnakom tvare ako v recipes.js
  function toRecipe(row) {
    const photos = (row.photos || []).map(photoUrl);
    return {
      id: row.id,
      fromDb: true,
      status: row.status,
      rejectReason: row.reject_reason,
      authorId: row.author_id,
      authorName: row.author_name || null,
      title: row.title,
      category: row.category,
      description: row.description,
      ingredients: row.ingredients,
      steps: row.steps,
      time: row.time_minutes,
      difficulty: row.difficulty,
      servings: Number(row.servings),
      servingsUnit: row.servings_unit,
      image: photos[0] || null,
      photos,
      photoPaths: row.photos || [],
      createdAt: row.created_at
    };
  }

  function toRow(data) {
    return {
      title: data.title,
      category: data.category,
      description: data.description,
      ingredients: data.ingredients,
      steps: data.steps,
      time_minutes: data.time,
      difficulty: data.difficulty,
      servings: data.servings,
      servings_unit: data.servingsUnit
    };
  }

  async function uploadPhotos(ownerId, recipeId, blobs) {
    const paths = [];
    for (const blob of blobs) {
      const name = `${ownerId}/${recipeId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`;
      const { error } = await sb.storage.from(BUCKET).upload(name, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (error) {
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
        fail(error);
      }
      paths.push(name);
    }
    return paths;
  }

  const SELECT = "id,title,category,description,ingredients,steps,time_minutes,difficulty,servings,servings_unit,photos,created_at,status,reject_reason,author_id,author_name";

  window.Backend = {
    configured: true,
    photoUrl,

    // Prihlásenie. onChange(user) sa volá pri štarte aj pri každej zmene.
    async init(onChange) {
      const { data } = await sb.auth.getSession();
      await loadUser(data.session);
      sb.auth.onAuthStateChange((event, session) => {
        if (event === "TOKEN_REFRESHED") return;
        // načítanie profilu mimo callbacku (odporúčanie Supabase)
        setTimeout(async () => { await loadUser(session); onChange(user, event); }, 0);
      });
      // odstrániť ?code=... z adresy po návrate z Googlu
      if (/[?&]code=/.test(location.search)) history.replaceState(null, "", location.pathname + location.hash);
      return user;
    },
    user: () => user,

    async signInWithGoogle(returnHash) {
      try { sessionStorage.setItem(REDIRECT_KEY, returnHash || "#/"); } catch (e) { /* nič */ }
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin + location.pathname, queryParams: { prompt: "select_account" } }
      });
      fail(error);
    },
    takeReturnHash() {
      try {
        const h = sessionStorage.getItem(REDIRECT_KEY);
        sessionStorage.removeItem(REDIRECT_KEY);
        return h;
      } catch (e) { return null; }
    },
    async signOut() {
      await sb.auth.signOut();
      user = null;
    },

    async setPublicName(name, acceptTerms) {
      const row = { public_name: name };
      if (acceptTerms) row.terms_accepted_at = new Date().toISOString();
      const { error } = await sb.from("profiles").update(row).eq("id", user.id);
      if (error && error.code === "23505") throw Object.assign(new Error("Toto meno už niekto používa. Vyber si iné."), { code: "taken" });
      if (error && error.code === "23514") throw Object.assign(new Error("Meno môže mať 3 – 30 znakov: písmená, číslice, medzeru, bodku, pomlčku a podčiarkovník."), { code: "format" });
      fail(error);
      user.publicName = name;
    },

    // --- obľúbené ---
    async getFavorites() {
      const { data, error } = await sb.from("favorites").select("recipe_id").order("created_at");
      fail(error);
      return data.map((r) => r.recipe_id);
    },
    async addFavorites(ids) {
      if (!ids.length) return;
      const { error } = await sb.from("favorites").upsert(ids.map((id) => ({ recipe_id: id, user_id: user.id })), { onConflict: "user_id,recipe_id", ignoreDuplicates: true });
      fail(error);
    },
    async removeFavorite(id) {
      const { error } = await sb.from("favorites").delete().eq("recipe_id", id).eq("user_id", user.id);
      fail(error);
    },

    // --- zdieľanie zoznamu ---
    async getShareToken() {
      let { data, error } = await sb.from("shared_lists").select("token").eq("user_id", user.id).maybeSingle();
      fail(error);
      if (data) return data.token;
      ({ data, error } = await sb.from("shared_lists").insert({ user_id: user.id }).select("token").single());
      fail(error);
      return data.token;
    },
    async getSharedList(token) {
      const { data, error } = await sb.rpc("get_shared_list", { p_token: token });
      fail(error);
      if (!data || !data.length) return null;
      return { publicName: data[0].public_name, recipeIds: data[0].recipe_ids || [] };
    },

    // --- recepty ---
    async listApprovedRecipes() {
      const { data, error } = await sb.from("recipes_public").select(SELECT).eq("status", "approved").order("created_at");
      fail(error);
      return data.map(toRecipe);
    },
    async getRecipe(id) {
      const { data, error } = await sb.from("recipes_public").select(SELECT).eq("id", id).maybeSingle();
      fail(error);
      return data ? toRecipe(data) : null;
    },
    async submitRecipe(data, photoBlobs) {
      const id = crypto.randomUUID();
      const paths = await uploadPhotos(user.id, id, photoBlobs);
      const { error } = await sb.from("recipes").insert({ ...toRow(data), id, author_id: user.id, photos: paths });
      if (error) {
        if (paths.length) await sb.storage.from(BUCKET).remove(paths);
        fail(error);
      }
      return { id, published: user.isAdmin };
    },
    async listMyRecipes() {
      const { data, error } = await sb.from("recipes_public").select(SELECT).eq("author_id", user.id).order("created_at", { ascending: false });
      fail(error);
      return data.map(toRecipe);
    },
    async deleteMyRecipe(recipe) {
      const { error } = await sb.from("recipes").delete().eq("id", recipe.id);
      fail(error);
      if (recipe.photoPaths.length) await sb.storage.from(BUCKET).remove(recipe.photoPaths);
    },

    // --- administrátor ---
    async adminCountPending() {
      const { count, error } = await sb.from("recipes").select("id", { count: "exact", head: true }).eq("status", "pending");
      fail(error);
      return count || 0;
    },
    async adminListPending() {
      const { data, error } = await sb.from("recipes_public").select(SELECT).eq("status", "pending").order("created_at");
      fail(error);
      return data.map(toRecipe);
    },
    // keepPaths: ponechané fotky (v novom poradí), newBlobs: nové fotky
    async adminSaveRecipe(recipe, data, keepPaths, newBlobs, status, rejectReason) {
      const owner = recipe.authorId || user.id;
      const added = newBlobs.length ? await uploadPhotos(owner, recipe.id, newBlobs) : [];
      const photos = [...keepPaths, ...added].slice(0, 5);
      const row = { ...toRow(data), photos };
      if (status) row.status = status;
      if (status === "rejected") row.reject_reason = rejectReason || null;
      const { error } = await sb.from("recipes").update(row).eq("id", recipe.id);
      if (error) {
        if (added.length) await sb.storage.from(BUCKET).remove(added);
        fail(error);
      }
      const removed = recipe.photoPaths.filter((p) => !photos.includes(p));
      if (removed.length) await sb.storage.from(BUCKET).remove(removed);
    },

    // --- účet (GDPR) ---
    async exportMyData() {
      const [favs, mine, share] = await Promise.all([
        this.getFavorites(),
        this.listMyRecipes(),
        sb.from("shared_lists").select("token,created_at").eq("user_id", user.id).maybeSingle()
      ]);
      const { data: profile } = await sb.from("profiles").select("public_name,terms_accepted_at,created_at").eq("id", user.id).single();
      return {
        vytvorene: new Date().toISOString(),
        ucet: { email: user.email, prihlasenie: "Google", ...profile },
        oblubene_recepty: favs,
        zdielany_odkaz: share.data || null,
        moje_recepty: mine.map((r) => ({
          id: r.id, stav: r.status, dovod_zamietnutia: r.rejectReason, nazov: r.title, kategoria: r.category,
          popis: r.description, suroviny: r.ingredients, postup: r.steps, cas_min: r.time,
          narocnost: r.difficulty, davka: r.servings + " " + r.servingsUnit, fotky: r.photos, vytvorene: r.createdAt
        }))
      };
    },
    async deleteAccount() {
      const mine = await this.listMyRecipes();
      const paths = mine.filter((r) => r.status !== "approved").flatMap((r) => r.photoPaths);
      if (paths.length) await sb.storage.from(BUCKET).remove(paths);
      const { error } = await sb.rpc("delete_my_account");
      fail(error);
      await sb.auth.signOut();
      user = null;
    }
  };
})();
