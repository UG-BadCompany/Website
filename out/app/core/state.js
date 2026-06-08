export const state = {
  bootstrap: null,
  roleView: localStorage.getItem('roleView') || 'owner',
  theme: JSON.parse(localStorage.getItem('theme') || '{}'),
  installDraft: JSON.parse(localStorage.getItem('installDraft') || '{}'),
  installStep: Number(localStorage.getItem('installStep') || 0),
};

export function saveRoleView(role) {
  state.roleView = role;
  localStorage.setItem('roleView', role);
}

export function saveInstallDraft(draft) {
  state.installDraft = draft;
  localStorage.setItem('installDraft', JSON.stringify(draft));
}

export function saveInstallStep(step) {
  state.installStep = step;
  localStorage.setItem('installStep', String(step));
}
