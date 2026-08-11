export function decideTrigger({ handoffState, contract, signal, now = new Date() }) {
  if (!handoffState || !contract) return { verdict: 'FAIL_CLOSED', reason: 'missing-state-or-contract' };
  if (!contract.supportedSignals?.includes(signal)) return { verdict: 'FAIL_CLOSED', reason: 'unsupported-signal' };
  if (contract.primaryExecutor !== 'GPT' || contract.rules?.gptIsPrimary !== true) {
    return { verdict: 'FAIL_CLOSED', reason: 'gpt-primary-contract-invalid' };
  }
  if (handoffState.status === 'COMPLETE') return { verdict: 'NOOP', reason: 'no-active-work' };
  if (handoffState.status === 'BLOCKED' || handoffState.status === 'EXTERNAL_AUDIT_REQUIRED') {
    return { verdict: 'FAIL_CLOSED', reason: 'handoff-state-blocked' };
  }
  if (handoffState.currentExecutor === 'GPT') {
    return { verdict: 'PRIMARY_CONTINUES', reason: 'gpt-already-primary' };
  }
  if (handoffState.currentExecutor !== 'JARVIS') {
    return { verdict: 'FAIL_CLOSED', reason: 'unsupported-source-executor' };
  }
  if (!Number.isInteger(handoffState.activePR) || handoffState.activePR <= 0) {
    return { verdict: 'FAIL_CLOSED', reason: 'active-pr-required' };
  }
  if (!handoffState.activeBranch || handoffState.activeBranch === 'none') {
    return { verdict: 'FAIL_CLOSED', reason: 'active-branch-required' };
  }
  if (!handoffState.nextStep) return { verdict: 'FAIL_CLOSED', reason: 'next-step-required' };

  const requestedAt = now.toISOString();
  const dedupeKey = `${handoffState.activePR}:${handoffState.headSHA}:${signal}`;
  return {
    verdict: 'EMIT_HANDOFF_READY',
    reason: signal,
    targetExecutor: 'GPT',
    activePR: handoffState.activePR,
    activeBranch: handoffState.activeBranch,
    checkpointHeadSHA: handoffState.headSHA,
    candidateFingerprint: handoffState.candidateFingerprint ?? null,
    resumeFrom: handoffState.nextStep,
    skipSteps: [...(handoffState.completedSteps || [])],
    requestedAt,
    dedupeKey,
  };
}

export function toHandoffReadyState(handoffState, triggerDecision) {
  if (triggerDecision?.verdict !== 'EMIT_HANDOFF_READY') {
    throw new Error('trigger decision must be EMIT_HANDOFF_READY');
  }
  return {
    ...handoffState,
    status: 'EXECUTOR_HANDOFF_READY',
    previousExecutor: handoffState.currentExecutor,
    handoffReason: triggerDecision.reason,
    checkpointedAt: triggerDecision.requestedAt,
  };
}

export function buildTriggerIssue({ decision, contract }) {
  if (decision?.verdict !== 'EMIT_HANDOFF_READY') throw new Error('cannot build issue for non-trigger decision');
  const title = `${contract.triggerIssuePrefix} PR#${decision.activePR} ${decision.checkpointHeadSHA.slice(0, 8)}`;
  const payload = {
    contractId: contract.contractId,
    targetExecutor: decision.targetExecutor,
    reason: decision.reason,
    activePR: decision.activePR,
    activeBranch: decision.activeBranch,
    checkpointHeadSHA: decision.checkpointHeadSHA,
    candidateFingerprint: decision.candidateFingerprint,
    resumeFrom: decision.resumeFrom,
    skipSteps: decision.skipSteps,
    requestedAt: decision.requestedAt,
    dedupeKey: decision.dedupeKey,
  };
  return {
    title,
    body: `Machine-readable GPT failover request.\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\``,
    payload,
  };
}
