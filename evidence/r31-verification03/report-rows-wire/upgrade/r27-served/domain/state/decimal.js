// Exact finite decimal arithmetic. Inputs/operations are bounded; no float threshold decisions.
export class Decimal {
 constructor(n,s=0){this.n=BigInt(n);this.s=s;while(this.s>0&&this.n%10n===0n){this.n/=10n;this.s--;}Object.freeze(this);}
 static from(v){if(v instanceof Decimal)return v;if(typeof v!=='string'||v.length>100||!/^[-+]?\d+(?:\.\d+)?$/.test(v))throw Error('DECIMAL_INVALID');const [a,b='']=v.split('.');return new Decimal(a+b,b.length);}
 align(b){b=Decimal.from(b);const s=Math.max(this.s,b.s);return [this.n*10n**BigInt(s-this.s),b.n*10n**BigInt(s-b.s),s];}
 add(b){const [a,c,s]=this.align(b);return new Decimal(a+c,s);}
 sub(b){const [a,c,s]=this.align(b);return new Decimal(a-c,s);}
 mul(b){b=Decimal.from(b);return new Decimal(this.n*b.n,this.s+b.s);}
 cmp(b){const [a,c]=this.align(b);return a<c?-1:a>c?1:0;}
 ratio(b,places=2){b=Decimal.from(b);if(b.n===0n)return null;const sign=(this.n<0n)!==(b.n<0n)?-1n:1n;let a=this.n<0n?-this.n:this.n,d=b.n<0n?-b.n:b.n; a*=10n**BigInt(b.s+places);d*=10n**BigInt(this.s);let q=a/d;if(a%d*2n>=d)q++;return new Decimal(sign*q,places).toString();}
 toString(){const minus=this.n<0n;let digits=(minus?-this.n:this.n).toString().padStart(this.s+1,'0');if(this.s)digits=digits.slice(0,-this.s)+'.'+digits.slice(-this.s);return(minus?'-':'')+digits;}
}
export const dec=v=>Decimal.from(v);
