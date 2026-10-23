import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';

export function StatusToast({message,onDismiss}:{message:string;onDismiss:()=>void}) {
  const visible=Boolean(message);
  const [lastMessage,setLastMessage]=useState(message);
  useEffect(()=>{if(message)setLastMessage(message);},[message]);
  return <div role="status" className={`toast${visible?' toast-visible':''}`} aria-hidden={!visible} inert={!visible}>
    <Check size={16}/><span>{message||lastMessage}</span>
    <button onClick={onDismiss} aria-label="Dismiss notification"><X size={15}/></button>
  </div>;
}
