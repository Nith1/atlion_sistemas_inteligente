// Service worker mínimo, só pra satisfazer o critério de instalabilidade do
// Chrome/Android (beforeinstallprompt exige um service worker registrado
// com handler de fetch) — de propósito não faz cache nem serve nada
// offline. Offline "de verdade" não é escopo aqui, só a sessão de estudo
// tem isso, resolvido à parte via localStorage (ver src/lib/sessao-offline).
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
