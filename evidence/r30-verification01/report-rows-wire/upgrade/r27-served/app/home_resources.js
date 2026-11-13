// One current view owns these two listeners. No document hooks, timers, locks or I/O.
export function bindHomeResources(root){
 const trigger=root.querySelector('#home-open-qr'),dialog=root.querySelector('#home-qr-dialog'),close=root.querySelector('#home-close-qr');
 const open=event=>{
  // Older browsers can still open the original image through the standard local link.
  if(!dialog.isConnected||typeof dialog.showModal!=='function')return;
  event.preventDefault();if(!dialog.open)dialog.showModal();
 };
 const dismiss=()=>{dialog.close();if(trigger.isConnected)trigger.focus();};
 trigger.addEventListener('click',open);close.addEventListener('click',dismiss);
 return()=>{trigger.removeEventListener('click',open);close.removeEventListener('click',dismiss);if(dialog.open)dialog.close();};
}
