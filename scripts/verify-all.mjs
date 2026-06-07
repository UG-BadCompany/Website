import { execFileSync } from 'node:child_process'; for (const [cmd,args] of [['npm',['run','build']],['npm',['test']]]) execFileSync(cmd,args,{stdio:'inherit'});
