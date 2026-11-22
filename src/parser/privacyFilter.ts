import { TreeData, Person, PrivacyConfig } from '../types';

export const DEFAULT_PRIVACY_CONFIG: PrivacyConfig = {
  enabled: true,
  redactLiving: true,
  livingCutoffYear: 1920,
  maskName: 'Private [Living]'
};

/**
 * Redacts personal identifying information for living individuals
 * to safeguard privacy when family trees are rendered on public sites.
 */
export function applyPrivacyFilter(data: TreeData, config: Partial<PrivacyConfig> = {}): TreeData {
  const activeConfig = { ...DEFAULT_PRIVACY_CONFIG, ...config };

  if (!activeConfig.enabled || !activeConfig.redactLiving) {
    return data;
  }

  const redactedPeople: Record<string, Person> = {};

  for (const [id, person] of Object.entries(data.people)) {
    if (person.isLiving) {
      redactedPeople[id] = {
        ...person,
        first: activeConfig.maskName || 'Private',
        surname: '',
        fullName: activeConfig.maskName || 'Private',
        // Redact exact birth date and place, keep decade or redact completely
        birth: person.birth ? { year: person.birth.year } : undefined,
        occupation: undefined,
        notes: ['Details redacted for privacy protection.']
      };
    } else {
      redactedPeople[id] = { ...person };
    }
  }

  return {
    ...data,
    people: redactedPeople
  };
}
