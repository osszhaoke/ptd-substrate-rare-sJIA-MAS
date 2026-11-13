// Derived observers never own an operation result. Store no error objects or user data.
export function observe(owner,callback){
 const failed=()=>{owner.observerFailures=Math.min(Number.MAX_SAFE_INTEGER,(owner.observerFailures||0)+1);};
 try{const result=callback();if(result&&typeof result.then==='function')Promise.resolve(result).catch(failed);}catch{failed();}
}
