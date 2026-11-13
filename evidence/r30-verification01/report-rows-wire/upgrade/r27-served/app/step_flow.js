// Presentation only. Data, confirmation, persistence and async ownership stay with each flow.
export class StepFlow {
 constructor(root,sections,attribute) {
  this.root=root;
  this.sections=sections;
  this.attribute=attribute;
  this.step=1;
 }
 show(step,{scroll=true}={}) {
  if(!Number.isInteger(step)||step<1||step>this.sections.length)throw Error('STEP_UNKNOWN');
  this.step=step;
  this.sections.forEach((id,index)=>{this.root.querySelector('#'+id).hidden=index+1!==step;});
  this.root.querySelectorAll('['+this.attribute+']').forEach(el=>{
   const active=Number(el.getAttribute(this.attribute))===step;
   el.classList.toggle('active',active);
   el.setAttribute('aria-current',active?'step':'false');
  });
  if(scroll)this.root.querySelector('.step-labels').scrollIntoView({block:'start'});
 }
}
