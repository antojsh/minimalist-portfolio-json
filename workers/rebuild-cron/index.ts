// Dispara el Deploy Hook de Workers Builds. Si falla, la ejecución queda marcada como error en
// el dashboard del Worker (Logs) y el sitio sigue sirviendo el build anterior: el navegador
// recalcula "hoy" por su cuenta, así que nadie ve un dato equivocado.

interface Env {
    DEPLOY_HOOK_URL: string;
}

interface Context {
    waitUntil(promise: Promise<unknown>): void;
}

async function rebuild(env: Env) {
    if (!env.DEPLOY_HOOK_URL) throw new Error("Falta el secreto DEPLOY_HOOK_URL");
    const response = await fetch(env.DEPLOY_HOOK_URL, { method: "POST" });
    if (!response.ok) throw new Error(`El Deploy Hook respondió ${response.status}: ${await response.text()}`);
    console.log("Build disparado", await response.text());
}

export default {
    async scheduled(_controller: unknown, env: Env, ctx: Context) {
        ctx.waitUntil(rebuild(env));
    },
    // Sin rutas públicas: no responde a visitas
    async fetch() {
        return new Response("Not found", { status: 404 });
    },
};
