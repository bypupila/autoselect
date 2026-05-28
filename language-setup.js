const btnEnglish = document.getElementById('btnEnglish');
const btnSpanish = document.getElementById('btnSpanish');
const statusText = document.getElementById('statusText');

async function saveLanguage(language) {
  const settings = await chrome.storage.sync.get(null);
  await chrome.storage.sync.set({
    ...settings,
    uiLanguage: language,
    languageChoiceRequired: false
  });
}

async function choose(language) {
  const isSpanish = language === 'es';
  statusText.textContent = isSpanish
    ? 'Guardando idioma...'
    : 'Saving language...';
  btnEnglish.disabled = true;
  btnSpanish.disabled = true;

  try {
    await saveLanguage(language);
    statusText.textContent = isSpanish
      ? 'Listo. Puedes cerrar esta pestaña o abrir el popup.'
      : 'Done. You can close this tab or open the popup.';
  } catch {
    statusText.textContent = isSpanish
      ? 'No se pudo guardar. Intenta de nuevo.'
      : 'Could not save. Please try again.';
    btnEnglish.disabled = false;
    btnSpanish.disabled = false;
  }
}

btnEnglish.addEventListener('click', () => choose('en'));
btnSpanish.addEventListener('click', () => choose('es'));
