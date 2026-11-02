import { createClient } from 'npm:@supabase/supabase-js@2';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,x-client-info,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
  if(req.method!=='POST')return reply({error:'Método no permitido'},405);
  try{
    const token=(req.headers.get('Authorization')||'').replace(/^Bearer\s+/i,'');
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:identity,error:authError}=await admin.auth.getUser(token);
    if(authError||!identity.user)return reply({error:'Sesión no válida'},401);
    const {data:profile,error:profileError}=await admin.from('perfiles').select('rol,activo').eq('id',identity.user.id).single();
    if(profileError||profile?.rol!=='admin'||!profile.activo)return reply({error:'Se requiere administrador activo'},403);
    const b=await req.json();
    if(b.op==='delete'){
      if(b.id===identity.user.id)throw new Error('No puedes eliminar tu propia cuenta.');
      const {error}=await admin.auth.admin.deleteUser(b.id);if(error)throw error;
      return reply({ok:true});
    }
    if(!['create','update'].includes(b.op)||!['admin','direccion'].includes(b.rol)||!String(b.nombre||'').trim()||typeof b.activo!=='boolean'||!Array.isArray(b.accesos))throw new Error('Datos no válidos.');
    if(b.id===identity.user.id&&(!b.activo||b.rol!=='admin'))throw new Error('No puedes quitarte tu acceso administrador.');
    let id=b.id,created=false;
    if(b.op==='create'){
      if(!String(b.email||'').includes('@')||String(b.password||'').length<8)throw new Error('Correo o contraseña no válidos.');
      const {data,error}=await admin.auth.admin.createUser({email:b.email,password:b.password,email_confirm:true,user_metadata:{full_name:b.nombre}});
      if(error)throw error;id=data.user.id;created=true;
    }
    const {error}=await admin.rpc('aplicar_perfil_accesos',{p_id:id,p_nombre:b.nombre,p_puesto:b.puesto||'',p_rol:b.rol,p_activo:b.activo,p_accesos:b.accesos});
    if(error){if(created)await admin.auth.admin.deleteUser(id);throw error;}
    await admin.from('bitacora_actividad').insert({usuario_id:identity.user.id,correo_usuario:identity.user.email,tipo_evento:'EVENT',accion:created?'Alta de usuario':'Cambio de usuario y permisos',detalle:id});
    return reply({ok:true,id});
  }catch(e){return reply({error:e instanceof Error?e.message:'Error de administración'},400);}
});
