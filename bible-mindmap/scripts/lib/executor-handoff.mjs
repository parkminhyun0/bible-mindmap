const SHA40 = /^[0-9a-f]{40}$/i;
const SHA256 = /^sha256:[0-9a-f]{64}$/i;

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function validateHandoffState(state, contract) {
  const errors = [];
  const required = contract.requiredStateFields || [];
  for (const field of required) {
    if (!(field in state)) errors.push(`missing field: ${field}`);
  }

  if (state.schemaVersion !== contract.schemaVersion) errors.push('schemaVersion mismatch');
  if (state.trackId !== contract.trackId) errors.push('trackId mismatch');
  if (!contract.allowedStatuses.includes(state.status)) errors.push(`invalid status: ${state.status}`);
  if (!contract.allowedExecutors.includes(state.currentExecutor)) errors.push(`invalid currentExecutor: ${state.currentExecutor}`);
  if (!contract.allowedExecutors.includes(state.previousExecutor)) errors.push(`invalid previousExecutor: ${state.previousExecutor}`);
  if (!Array.isArray(state.completedSteps)) errors.push('completedSteps must be an array');
  if (!SHA40.test(String(state.baseSHA || ''))) errors.push('baseSHA must be a full 40-char SHA');
  if (!SHA40.test(String(state.headSHA || ''))) errors.push('headSHA must be a full 40-char SHA');
  if (state.candidateFingerprint !== null && !SHA256.test(String(state.candidateFingerprint || ''))) {
    errors.push('candidateFingerprint must be null or sha256:<64 hex>');
  }
  if (!Number.isInteger(state.activePR) || state.activePR < 0) errors.push('activePR must be an integer >= 0');
  if (typeof state.activeBranch !== 'string' || state.activeBranch.trim() === '') errors.push('activeBranch must be non-empty');
  if (typeof state.phase !== 'string' || state.phase.trim() === '') errors.push('phase must be non-empty');
  if (typeof state.nextAction !== 'string' || state.nextAction.trim() === '') errors.push('nextAction must be non-empty');
  if (typeof state.handoffReason !== 'string' || state.handoffReason.trim() === '') errors.push('handoffReason must be non-empty');

  const checkpoint = new Date(state.checkpointedAt);
  if (Number.isNaN(checkpoint.getTime())) errors.push('checkpointedAt must be a valid ISO date');

  if (!state.externalAudit || typeof state.externalAudit !== 'object') {
    errors.push('externalAudit must be an object');
  } else {
    if (!contract.externalAuditStatuses.includes(state.externalAudit.status)) {
      errors.push(`invalid externalAudit.status: ${state.externalAudit.status}`);
    }
    if (state.externalAudit.required && state.externalAudit.status === 'NOT_REQUIRED') {
      errors.push('externalAudit required but status is NOT_REQUIRED');
    }
  }

  const order = contract.stepOrder || [];
  if (Array.isArray(state.completedSteps)) {
    const unique = new Set(state.completedSteps);
    if (unique.size !== state.completedSteps.length) errors.push('completedSteps contains duplicates');
    for (const step of state.completedSteps) {
      if (!order.includes(step)) errors.push(`unknown completed step: ${step}`);
    }
    const expectedPrefix = order.slice(0, state.completedSteps.length);
    if (JSON.stringify(expectedPrefix) !== JSON.stringify(state.completedSteps)) {
      errors.push('completedSteps must be a contiguous prefix of stepOrder');
    }
    const expectedNext = order[state.completedSteps.length] || null;
    if (state.status === 'COMPLETE') {
      if (state.completedSteps.length !== order.length) errors.push('COMPLETE requires all steps completed');
    } else if (state.nextStep !== expectedNext) {
      errors.push(`nextStep mismatch: expected ${expectedNext}, got ${state.nextStep}`);
    }
  }

  if (state.status === 'EXTERNAL_AUDIT_REQUIRED') {
    if (!state.externalAudit?.required || state.externalAudit?.status !== 'REQUIRED') {
      errors.push('EXTERNAL_AUDIT_REQUIRED requires externalAudit.required=true and status=REQUIRED');
    }
  }

  return errors;
}

export function decideHandoff(state, runtime) {
  if (!runtime?.retrievalOk) {
    return { verdict: 'FAIL_CLOSED', reason: 'github-state-retrieval-failed' };
  }
  if (runtime.openPrCountForBranch > 1) {
    return { verdict: 'FAIL_CLOSED', reason: 'duplicate-open-prs-for-active-branch' };
  }
  if (state.activePR > 0 && !runtime.prOpen && state.status !== 'COMPLETE') {
    return { verdict: 'FAIL_CLOSED', reason: 'active-pr-not-open' };
  }
  if (runtime.headRelation === 'diverged' || runtime.headRelation === 'behind') {
    return { verdict: 'FAIL_CLOSED', reason: 'checkpoint-head-not-ancestor-of-current-head' };
  }
  if (state.candidateFingerprint && runtime.candidateFingerprint && state.candidateFingerprint !== runtime.candidateFingerprint) {
    return { verdict: 'FAIL_CLOSED', reason: 'candidate-fingerprint-drift' };
  }
  if (state.externalAudit?.required && state.externalAudit.status !== 'SATISFIED') {
    return { verdict: 'EXTERNAL_AUDIT_REQUIRED', reason: 'required-external-audit-missing' };
  }
  if (state.status === 'BLOCKED') return { verdict: 'BLOCKED', reason: state.handoffReason };
  if (state.status === 'COMPLETE') return { verdict: 'COMPLETE', reason: 'handoff-work-complete' };
  if (state.status === 'EXTERNAL_AUDIT_REQUIRED') {
    return { verdict: 'EXTERNAL_AUDIT_REQUIRED', reason: state.handoffReason };
  }

  const targetExecutor = runtime.currentExecutor;
  if (!targetExecutor || targetExecutor === 'NONE') {
    return { verdict: 'FAIL_CLOSED', reason: 'no-target-executor' };
  }

  if (targetExecutor !== state.currentExecutor) {
    if (state.status !== 'EXECUTOR_HANDOFF_READY') {
      return { verdict: 'WAIT_FOR_HANDOFF_READY', reason: 'executor-change-without-handoff-ready-state' };
    }
    return {
      verdict: 'HANDOFF_ACCEPTED',
      reason: 'executor-switch-on-github-ssot',
      resumeFrom: state.nextStep,
      skipSteps: [...state.completedSteps],
      currentHeadSHA: runtime.currentHeadSHA,
    };
  }

  return {
    verdict: 'RESUME_SAME_EXECUTOR',
    reason: 'same-executor-resume',
    resumeFrom: state.nextStep,
    skipSteps: [...state.completedSteps],
    currentHeadSHA: runtime.currentHeadSHA,
  };
}
