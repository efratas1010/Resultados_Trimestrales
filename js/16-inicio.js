'use strict';
(async function init(){
  let theme=null;try{theme=localStorage.getItem(CONFIG.THEME_KEY);}catch(e){}
  document.documentElement.dataset.theme=theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
  Store.state=Store.empty();Store.state.areas=[];Store.state.unidadesNegocio=[];Auth.load();
  try{
    if(!window.supabase?.createClient)throw new Error('No se pudo cargar la librería de Supabase. Revisa tu conexión y recarga.');
    Cloud.client=window.supabase.createClient(CLOUD_CONFIG.url,CLOUD_CONFIG.publishableKey);
    Cloud.client.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY')setTimeout(async()=>{
        try{await Cloud.load();enterApp();openAccount();}catch(e){renderLogin(e.message);}
      },0);
      if(event==='SIGNED_OUT'&&Cloud.ready){Cloud.ready=false;Auth.user=null;Store.state=Store.empty();renderLogin('La sesión terminó.');}
    });
    const {data,error}=await Cloud.client.auth.getSession();if(error)throw error;
    if(data.session){await Cloud.load();enterApp();}else renderLogin();
  }catch(e){Cloud.ready=false;Auth.user=null;renderLogin(e.message);console.error(e);}
})();
