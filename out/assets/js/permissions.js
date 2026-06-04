window.TAPermissions={
  hierarchy:{owner:100,admin:80,manager:60,worker:40,client:20,guest:10},
  has(user,perms=[]){if(!perms.length)return true;const keys=user?.permissions?.permissionKeys||user?.permissionKeys||[];return perms.every(p=>keys.includes(p)||(p!=='homepage.manage'&&keys.includes('admin.tools')))},
  rank(roleKey=''){return this.hierarchy[String(roleKey).toLowerCase()]||10},
  highestRank(user){const roles=user?.roles||user?.roleKeys||[];return Math.max(0,...roles.map((role)=>this.rank(role)))},
  canManageRole(user,roleKey){const roles=user?.roles||user?.roleKeys||[];return roles.includes('owner')||this.rank(roleKey)<this.highestRank(user)},
  canGrant(user,permission){const roles=user?.roles||user?.roleKeys||[];const keys=user?.permissions?.permissionKeys||user?.permissionKeys||[];return roles.includes('owner')||keys.includes(permission)}
};
