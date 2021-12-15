import { RoleSet } from '../../../generated/PermissionManager/PermissionManager';
import { getOrInitUser } from '../../helpers/initializers';
import { PermissionedRole } from '../../../generated/schema';

export function handleRoleSet(event: RoleSet): void {
  let user = getOrInitUser(event.params.user);
  let role = event.params.role;
  let timestamp = event.block.timestamp.toI32();
  let id = user.id + ':' + role.toString();

  let userRole = PermissionedRole.load(id);
  if (!userRole) {
    userRole = new PermissionedRole(id);
    userRole.user = user.id;
    userRole.roleId = role;
    userRole.whiteLister = event.params.whiteLister;
    userRole.createdAt = timestamp;
  }

  userRole.active = event.params.set;
  userRole.updatedAt = timestamp;
  userRole.save();
}
