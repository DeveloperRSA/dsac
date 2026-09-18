export const ROLES = {
  DSAC_ADMIN: 'DSAC_ADMIN',
  DSAC_REVIEWER: 'DSAC_REVIEWER',
  ORG_ADMIN: 'ORG_ADMIN',
  ORG_STAFF: 'ORG_STAFF',
  EXTERNAL_COLLABORATOR: 'EXTERNAL_COLLABORATOR',
};

export const VALID_ROLES = Object.values(ROLES);

export function isValidRole(role) {
  return VALID_ROLES.includes(role);
}