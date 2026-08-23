const { createClient } = require("@supabase/supabase-js");

function serverClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function verifyUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) throw new Error("Missing Supabase access token");
  const token = auth.slice(7);
  const client = serverClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error("Invalid Supabase access token");
  return data.user;
}

module.exports = { serverClient, verifyUser };
