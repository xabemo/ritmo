/* RITMO 1.39: puesta en marcha, avisos y compartir actuaciones. */

function installed139(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
function installGuide139(){return `<section class="card install-guide139"><div class="eyebrow">PRIMER PASO</div><h2>RITMO en tu pantalla de inicio</h2><p>Ábrelo desde su icono para usarlo como una app.</p><div class="install-platforms139"><div><b>iPhone · Safari</b><span>Pulsa Compartir y después «Añadir a pantalla de inicio».</span></div><div><b>Android · Chrome</b><span>Abre el menú de tres puntos y elige «Instalar aplicación» o «Añadir a pantalla de inicio».</span></div></div></section>`}
function modalInstall139(){socialModal133('Instala RITMO',installGuide139())}
const initialStepsBase139=initialSteps131;
initialSteps131=function(){return [{id:'install',title:'Añadir RITMO a la pantalla de inicio',text:'iPhone: Safari → Compartir → Añadir a pantalla de inicio. Android: Chrome → ⋮ → Instalar aplicación o Añadir a pantalla de inicio.',done:installed139(),action:'modalInstall139()'},...initialStepsBase139()]};
tourSteps131.unshift(['header .brand','Instala RITMO','En iPhone: abre RITMO en Safari, pulsa Compartir y «Añadir a pantalla de inicio». En Android: abre Chrome, pulsa ⋮ y «Instalar aplicación» o «Añadir a pantalla de inicio».']);
const helpBase139=help131;
help131=function(){return helpBase139().replace('<section class="card"><h2>Un paseo por RITMO',installGuide139()+'<section class="card"><h2>Un paseo por RITMO')};

/* El domicilio pertenece a la cuenta. El proyecto predeterminado no se modifica aquí. */
const travelModalBase139=modalTravelSettings;
modalTravelSettings=function(){travelModalBase139();document.getElementById('sdefaultproject')?.closest('label')?.remove();document.getElementById('shome')?.closest('label')?.insertAdjacentHTML('beforebegin','<p class="muted travel-home-note139">Este es tu domicilio personal para calcular las rutas de todos tus bolos, sea cual sea el proyecto.</p>')};
saveTravelSettings=async function(event){event.preventDefault();const err=document.getElementById('settingsError');err.innerHTML='';const payload={home_address:document.getElementById('shome').value.trim(),average_speed_kmh:Number(document.getElementById('sspeed').value||0),departure_margin_minutes:Number(document.getElementById('smargin').value||0),updated_at:new Date().toISOString()};const query=window.userSettings?.user_id?db.from('user_settings').update(payload).eq('user_id',session.user.id):db.from('user_settings').insert({...payload,user_id:session.user.id});const {error}=await query;if(error){err.innerHTML=`<div class="error">${esc(error.message)}</div>`;return}await loadUserSettings();closeModal();render()};
const kmModalBase139=modalKmPrices;
modalKmPrices=function(){kmModalBase139();document.getElementById('kpprice')?.closest('label')?.insertAdjacentHTML('beforebegin','<label class="export-check no-km139"><input id="kpNone139" type="checkbox" onchange="toggleNoKm139(this)"> No aplicar tarifa por km</label>')};
function toggleNoKm139(box){const input=document.getElementById('kpprice');if(!input)return;input.disabled=box.checked;if(box.checked)input.value='0';else input.value=''}

/* El saludo de medianoche corresponde a la noche anterior. */
greeting=function(){const hour=new Date().getHours();return hour>=5&&hour<13?'Buenos días':hour>=13&&hour<20?'Buenas tardes':'Buenas noches'};

/* La foto de perfil se convierte a una miniatura ligera antes de subirla. */
const profileModalBase139=modalProfile;
modalProfile=function(){profileModalBase139();const field=document.getElementById('profileName');if(!field||document.getElementById('avatarFile139'))return;const current=window.userSettings?.avatar_url||'';field.closest('label')?.insertAdjacentHTML('afterend',`<label>Foto o avatar<input id="avatarFile139" type="file" accept="image/jpeg,image/png,image/webp" onchange="previewAvatar140(this)"></label><p class="muted">Se recorta en redondo y se optimiza automáticamente antes de subirla.</p><img id="avatarPreview140" class="profile-avatar140 ${current?'':'empty'}" ${current?`src="${esc(current)}"`:''} alt="Vista previa del avatar">`)};
function previewAvatar140(input){const preview=document.getElementById('avatarPreview140'),file=input?.files?.[0];if(!preview||!file)return;const url=URL.createObjectURL(file);preview.onload=()=>URL.revokeObjectURL(url);preview.src=url;preview.classList.remove('empty')}
function optimizeAvatar140(file){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),image=new Image();image.onload=()=>{try{const side=Math.min(512,Math.max(image.naturalWidth,image.naturalHeight));const canvas=document.createElement('canvas');canvas.width=side;canvas.height=side;const source=Math.min(image.naturalWidth,image.naturalHeight),left=(image.naturalWidth-source)/2,top=(image.naturalHeight-source)/2;canvas.getContext('2d',{alpha:false}).drawImage(image,left,top,source,source,0,0,side,side);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return reject(Error('No se pudo optimizar la foto.'));resolve(new File([blob],'avatar.webp',{type:'image/webp'}))},'image/webp',.78)}catch(e){URL.revokeObjectURL(url);reject(e)}};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo leer la foto.'))};image.src=url})}
saveProfile=async function(event){event.preventDefault();const button=event.target.querySelector('button.primary'),err=document.getElementById('profileError'),file=document.getElementById('avatarFile139')?.files[0];if(button.disabled)return;button.disabled=true;err.innerHTML='';try{if(file&&(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024))throw Error('Elige una imagen JPG, PNG o WebP de hasta 10 MB.');const avatar=file?await uploadBoloFile(await optimizeAvatar140(file),'avatar'):window.userSettings?.avatar_url||null;const payload={display_name:document.getElementById('profileName').value.trim(),avatar_url:avatar,updated_at:new Date().toISOString()},query=window.userSettings?.user_id?db.from('user_settings').update(payload).eq('user_id',session.user.id):db.from('user_settings').insert({...payload,user_id:session.user.id});const {error}=await query;if(error)throw error;await loadUserSettings();closeModal();render()}catch(e){err.innerHTML=`<div class="error">${esc(e.message)}</div>`}finally{button.disabled=false}};

/* Los datos opcionales de Hoy tocan se consultan solo entre amigos. */
const socialLoadBase139=loadSocial133;
loadSocial133=async function(redraw=true){await socialLoadBase139(false);if(session&&socialOwner133===session.user.id){const {data,error}=await db.rpc('ritmo_social_feed_v139');if(!error&&data){social133.feed=data.feed||[];social133.posts=data.posts||[]}else if(error)console.warn('No se pudieron actualizar las publicaciones:',error.message)}if(redraw&&!document.getElementById('modal')&&tourIndex131<0)render()};
function cityFromPlace139(value){return String(value||'').split(',').map(x=>x.trim()).filter(Boolean).at(-1)||''}
modalPublish133=function(id){const gig=gigs.find(g=>g.id===id),post=social133.posts.find(p=>p.bolo_id===id);if(!gig)return;const city=cityFromPlace139(gig.location);socialModal133('Compartir en «Hoy tocan…»',`<h3>${esc(projectById(gig.project_id).name)}</h3><p class="muted">Tus amigos verán esta publicación el día del bolo. La localidad se toma de la ficha: <b>${esc(city||'pendiente')}</b>.</p>${!city?'<p class="error">Añade la localidad a la ficha para poder publicarlo.</p>':''}<form class="form" onsubmit="publishSocial133(event,'${id}')"><label>Mensaje opcional<textarea id="socialMessage139" maxlength="280" rows="3" placeholder="Hoy tocamos aquí. ¡Nos vemos!">${esc(post?.message||'')}</textarea></label><label class="export-check"><input id="socialLocation139" type="checkbox" ${post?.share_location?'checked':''}> Mostrar también la ubicación completa</label><label class="export-check"><input id="socialPasses139" type="checkbox" ${post?.share_passes?'checked':''}> Mostrar los horarios de los pases</label><label class="export-check"><input id="socialVisible139" type="checkbox" ${post?.visible?'checked':''} ${city?'':'disabled'}> Mostrar el bolo en «Hoy tocan…»</label><p class="muted">No se comparten caché, cobros, gastos, domicilio ni hora de salida.</p><button class="primary" ${city?'':'disabled'}>Guardar publicación</button></form>`)};
publishSocial133=async function(event,id){event.preventDefault();const button=event.target.querySelector('button.primary');if(button.disabled||socialWriting133)return;button.disabled=true;socialWriting133=true;try{const {error}=await db.rpc('ritmo_social_publish_v139',{p_bolo:id,p_visible:document.getElementById('socialVisible139').checked,p_message:document.getElementById('socialMessage139').value.trim(),p_share_location:document.getElementById('socialLocation139').checked,p_share_passes:document.getElementById('socialPasses139').checked});if(error)throw error;await loadSocial133(false);closeModal();render();socialToast133('Publicación guardada')}catch(e){document.getElementById('socialModalError133').innerHTML=`<div class="error">${esc(e.message)}</div>`}finally{socialWriting133=false;button.disabled=false}};
socialFeed133=function(){return `<p class="social-subtle">Solo aparecen los bolos que tus amigos deciden compartir hoy. El organizador elige si muestra la ubicación y los horarios.</p>${social133.feed.map(post=>`<article class="social-card"><div class="social-person"><span class="social-monogram">${socialInitial133(post.name)}</span><div><b>${esc(post.name)} toca hoy</b><small>${esc(post.city)}</small></div></div><div class="social-feed-project">${esc(post.project)}</div>${post.message?`<p class="social-feed-message139">${esc(post.message)}</p>`:''}${post.location?`<p class="social-feed-location139">⌖ ${esc(post.location)} · <a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(post.location)}" target="_blank" rel="noopener">Ver mapa</a></p>`:''}${(post.passes||[]).length?`<div class="social-feed-passes139">${post.passes.map(p=>`<div class="line"><span>Pase ${Number(p.number)} · ${esc(p.type)}</span><b>${esc(String(p.start||'').slice(0,5))}${p.end?' – '+esc(String(p.end).slice(0,5)):''}</b></div>`).join('')}</div>`:''}<div class="social-actions"><button class="secondary" onclick="socialAction133(this,'cheer',{post:'${post.id}',message:'¡Buen bolo!'})">¡Buen bolo!</button><button class="secondary" onclick="socialAction133(this,'cheer',{post:'${post.id}',message:'¡A disfrutar!'})">¡A disfrutar!</button><button class="primary" onclick="modalCheer133('${post.id}')">Enviar ánimo</button></div></article>`).join('')||`<section class="social-card social-empty">${socialIcon133()}<h3>Hoy aún no hay actuaciones compartidas</h3><p>Tus amigos aparecerán aquí cuando publiquen un bolo.</p></section>`}`};

/* Avisos: entradas directas y actualización de la portada mientras la app está visible. */
function unreadStatus139(item){return item.status!=='pending'&&!unreadReply135(item)&&new Date(item.updated_at)>new Date(item.reply_seen_at||item.created_at)}
const activityBase139=activityFeed;
activityFeed=function(){const out=activityBase139();for(const item of out){const title=String(item[1]).toLocaleLowerCase('es');if(/mensaje.*ánimo/.test(title))item[3]='friends:messages';else if(/solicitud|invitación a proyecto/.test(title))item[3]='friends:pending';else if(item[3]==='friends')item[3]='friends:events'}const changed=myFeedback132.filter(unreadStatus139).length;if(changed)out.push(['✎',`${changed} mensaje${changed===1?'':'s'} en revisión o resuelto${changed===1?'':'s'}`,'Administración ha actualizado el estado.','feedback']);return out};
function openActivity139(target){closeModal();if(target.startsWith('friends:'))goFriends136(target.slice(8));else go(target)}
openNotifications=function(){const feed=activityFeed();markNotificationsSeen();document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Actividad reciente en RITMO</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map(item=>`<button class="activity-item" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span></div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades desde tu última visita.</div>`}</div></div>`)};
const todayBase139=todayCenter;
todayCenter=function(gig,owed){const items=todayBase139(gig,owed),cheers=social133.cheers.filter(c=>c.incoming&&!c.seen).length,states=myFeedback132.filter(unreadStatus139).length;if(cheers)items.unshift(['♡',`${cheers} mensaje${cheers===1?'':'s'} de ánimo`,'Abre las palabras de tus amigos',"goFriends136('messages')"]);if(states)items.unshift(['✎','Administración ha actualizado tu mensaje','Consulta su estado en Sugerencias y errores',"go('feedback')"]);return items};
const feedbackRowsBase139=feedbackRows132;
feedbackRows132=function(){let index=0;return feedbackRowsBase139().replace(/<\/article>/g,()=>{const item=myFeedback132[index++];return item&&unreadStatus139(item)?`<p class="feedback-status139">Estado actualizado: ${esc(feedbackStates132[item.status]||item.status)}</p><button class="secondary" onclick="readStatus139(this,'${item.id}')">Marcar actualización vista</button></article>`:'</article>'})};
async function readStatus139(button,id){button.disabled=true;try{const {error}=await db.rpc('ritmo_feedback_read',{p_id:id});if(error)throw error;await loadMyFeedback132();render()}catch(e){alert(e.message)}finally{button.disabled=false}}
function homeUpcoming139(){const rows=gigs.filter(g=>g.event_date>=localDate()&&g.status!=='cancelado').sort((a,b)=>a.event_date.localeCompare(b.event_date)).slice(0,4);return `<section class="card upcoming-simple139"><div class="card-head"><b>Próximos bolos</b><span class="arrow">›</span></div>${rows.map(g=>{const r=boloReadiness(g),percent=r.total?Math.round(r.done/r.total*100):0;return `<button class="upcoming-row139" onclick="goGig('${g.id}')"><span class="upcoming-date139">${new Date(g.event_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span><span class="upcoming-info139"><b>${esc(projectById(g.project_id).name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(boloStatusLabel(g.status))}</small><span class="upcoming-progress139"><span style="width:${percent}%"></span></span><small>Ficha ${percent}% completa</small></span><span class="arrow" aria-hidden="true">›</span></button>`}).join('')||'<p class="muted">Todavía no hay fechas próximas.</p>'}</section>`}
const homeBase139=home;
home=function(){let html=homeBase139();if(social133.cheers.some(c=>c.incoming&&!c.seen)||myFeedback132.some(unreadStatus139))html=html.replace('class="card today-center"','class="card today-center attention135"');const index=html.indexOf('<div class="upcoming-mini">');if(index>=0)html=html.slice(0,index)+homeUpcoming139();return html};

let lastRefresh139=0;
function refreshSocialAlerts139(){if(!session||needsAccountSetup()||accountBlocked132||document.visibilityState!=='visible'||document.getElementById('modal')||socialWriting133||Date.now()-lastRefresh139<15000)return;lastRefresh139=Date.now();loadSocial133(true).catch(e=>console.warn('Avisos:',e.message))}
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refreshSocialAlerts139()});
window.addEventListener('focus',refreshSocialAlerts139);
setInterval(refreshSocialAlerts139,30000);

/* RITMO 1.40: progreso compacto en Mis bolos y aviso de novedades por versión. */
boloReadinessMarkup=function(g){const r=boloReadiness(g),percent=r.total?Math.round(r.done/r.total*100):0,label=r.done===r.total?'Ficha completa':`Ficha ${percent}% completa`;return `<span class="gig-readiness progress140" title="${esc(r.done===r.total?'Ficha completa':`Faltan: ${r.missing.join(', ')}`)}" aria-label="${esc(label)}"><span class="gig-progress140"><i style="width:${percent}%"></i></span><b>${percent}%</b></span>`};

const RITMO_RELEASE140={version:'1.40',title:'RITMO se ha actualizado',description:'Avatar optimizado, progreso más claro en Mis bolos y avisos de novedades.',changes:['La foto de perfil se sube como miniatura WebP de 512 px para ahorrar espacio y carga más rápida.','Mis bolos usa una barra con porcentaje de ficha completada.','Cada nueva versión puede avisarse dentro de RITMO desde la campana y el Centro del día.','Inicio estrena una frase musical que cambia cada día.']};
function releaseKey140(){return `ritmo-release-${RITMO_RELEASE140.version}-${session?.user?.id||'guest'}`}
function releaseUnread140(){return Boolean(session?.user?.id)&&localStorage.getItem(releaseKey140())!=='seen'}
function openRelease140(){localStorage.setItem(releaseKey140(),'seen');closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE140.version}</div><h3>${RITMO_RELEASE140.title}</h3><p class="muted">${RITMO_RELEASE140.description}</p><ul class="release-list140">${RITMO_RELEASE140.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
const activityReleaseBase140=activityFeed;
activityFeed=function(){const items=activityReleaseBase140();if(releaseUnread140())items.unshift(['✦',RITMO_RELEASE140.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE140.version+'.','release140']);return items};
const openActivityReleaseBase140=openActivity139;
openActivity139=function(target){if(target==='release140'){openRelease140();return}openActivityReleaseBase140(target)};
const todayReleaseBase140=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase140(gig,owed);if(releaseUnread140())items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE140.version+'.','openRelease140()']);return items};
const homeReleaseBase140=home;
function dailySlogan140(){const phrases=['Hoy vas a tu… RITMO.','Recuerda: cada uno necesita su… RITMO.','Con calma, con música y a tu… RITMO.','Organiza el día. Disfruta el RITMO.','Si hay bolo, hay RITMO.','Todo entra mejor cuando vas a tu… RITMO.','Que el día suene a tu… RITMO.','Que el RITMO no pare, no pare, no…','Café, cables y a tu… RITMO.','Hoy el caos va con metrónomo.','Si llegas a tiempo, que no se note.','Un bolo a la vez. Y si hay dos, respira.','Afinado, organizado y con batería.','La prueba de sonido también cuenta como cardio.','No es prisa: es tempo allegro.','Todo bajo control. Más o menos.','La furgoneta sabe el camino. Tú lleva el RITMO.','Tu agenda tiene más compases que excusas.','Que no falte nada… salvo tiempo para montar.','Hoy toca. Y no solo música.','Respira: aún queda margen. Probablemente.','Un cable menos perdido, un día más feliz.','Llegar puntual también es una forma de arte.'];const day=Math.floor(new Date().setHours(0,0,0,0)/86400000);return phrases[Math.abs(day)%phrases.length]}
home=function(){let html=homeReleaseBase140();html=html.replace(/(<div class="home-greeting"><h1>[\s\S]*?<\/h1><div class="date">[\s\S]*?<\/div>)/,`$1<div class="daily-slogan140">${dailySlogan140()}</div>`);if(releaseUnread140())html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* RITMO 1.41: los avisos vistos se conservan entre aperturas y el avatar superior es circular. */
function notificationSeenKey141(){return `ritmo-notification-seen-v141-${session?.user?.id||'guest'}`}
function notificationSeenMap141(){try{return JSON.parse(localStorage.getItem(notificationSeenKey141())||'{}')}catch{return {}}}
function notificationSignature141(item){return [item?.[0]||'',item?.[1]||'',item?.[2]||'',item?.[3]||''].join('|')}
function markActivityItemsSeen141(items){if(!session?.user?.id)return;const seen=notificationSeenMap141(),now=Date.now();for(const item of items||[]){const target=String(item?.[3]||'');if(target==='release140')localStorage.setItem(releaseKey140(),'seen');else if(target==='release141')localStorage.setItem(releaseKey141(),'seen');else seen[notificationSignature141(item)]=now}const recent=Object.entries(seen).filter(([,at])=>Number(at)>now-1000*60*60*24*45).slice(-250);localStorage.setItem(notificationSeenKey141(),JSON.stringify(Object.fromEntries(recent)))}
const activityPersistBase141=activityFeed;
activityFeed=function(){const seen=notificationSeenMap141();return activityPersistBase141().filter(item=>String(item?.[3]||'').startsWith('release')||!seen[notificationSignature141(item)])};
const activityLastSeenBase141=activityLastSeen;
activityLastSeen=function(){const local=localStorage.getItem(activityStorageKey()),remote=syncedActivitySeenAt,localTime=Date.parse(local||''),remoteTime=Date.parse(remote||'');if(Number.isFinite(localTime)||Number.isFinite(remoteTime))return Number.isFinite(localTime)&&(!Number.isFinite(remoteTime)||localTime>=remoteTime)?local:remote;return activityLastSeenBase141()};
const loadNotificationStateBase141=loadNotificationState;
loadNotificationState=async function(){const local=localStorage.getItem(activityStorageKey()),localTime=Date.parse(local||'');await loadNotificationStateBase141();const remoteTime=Date.parse(syncedActivitySeenAt||'');if(Number.isFinite(localTime)&&(!Number.isFinite(remoteTime)||localTime>remoteTime))syncedActivitySeenAt=local};
const openNotificationsBase141=openNotifications;
openNotifications=function(){const visible=activityFeed();openNotificationsBase141();markActivityItemsSeen141(visible)};

const RITMO_RELEASE141={version:'1.41',title:'Notificaciones más fiables',description:'Los avisos ya vistos no vuelven al cerrar RITMO y el avatar superior se muestra en círculo.',changes:['La campana recuerda los avisos que ya has consultado, incluso al cerrar y volver a abrir la app.','Las acciones que siguen pendientes permanecen disponibles en el Centro del día.','La foto de tu cuenta ahora se presenta redonda también en la cabecera.']};
function releaseKey141(){return `ritmo-release-${RITMO_RELEASE141.version}-${session?.user?.id||'guest'}`}
function releaseUnread141(){return Boolean(session?.user?.id)&&localStorage.getItem(releaseKey141())!=='seen'}
function openRelease141(){localStorage.setItem(releaseKey141(),'seen');closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE141.version}</div><h3>${RITMO_RELEASE141.title}</h3><p class="muted">${RITMO_RELEASE141.description}</p><ul class="release-list140">${RITMO_RELEASE141.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`) }
const activityReleaseBase141=activityFeed;
activityFeed=function(){const items=activityReleaseBase141();if(releaseUnread141())items.unshift(['✦',RITMO_RELEASE141.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE141.version+'.','release141']);return items};
const openActivityReleaseBase141=openActivity139;
openActivity139=function(target){if(target==='release141'){openRelease141();return}openActivityReleaseBase141(target)};
const todayReleaseBase141=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase141(gig,owed);if(releaseUnread141())items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE141.version+'.','openRelease141()']);return items};
const homeReleaseBase141=home;
home=function(){let html=homeReleaseBase141();if(releaseUnread141())html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* RITMO 1.42: programa directo, encuadre del avatar y avisos consultables durante 24 horas. */
const programCardBase142=programCard138;
programCard138=function(g){return programCardBase142(g).replace(`onclick="modalBolo('${g.id}')"`,`onclick="modalProgramUpload142('${g.id}')"`)};
function modalProgramUpload142(id){const g=gigs.find(x=>String(x.id)===String(id));if(!g)return;document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal direct-program-modal142"><div class="modal-head"><div><h2>Adjuntar programa</h2><div class="muted">${esc(projectById(g.project_id).name)} · ${esc(g.event_date)}</div></div><button type="button" onclick="closeModal()">✕</button></div><p class="muted">Elige una foto, escanéala con la cámara o adjunta el PDF. Se guardará directamente en esta ficha.</p><form class="form" onsubmit="saveProgramUpload142(event,'${g.id}')"><label>Programa, foto o documento<input id="programFile142" type="file" accept="image/*,.pdf" capture="environment" required onchange="previewProgramUpload142(this)"></label><div id="programPreview142" class="program-upload-preview142" hidden></div><button class="primary">Guardar programa</button><div id="programUploadError142"></div></form></div></div>`) }
function previewProgramUpload142(input){const file=input?.files?.[0],box=document.getElementById('programPreview142');if(!file||!box)return;box.hidden=false;if(file.type.startsWith('image/')){const url=URL.createObjectURL(file);box.innerHTML=`<img src="${url}" alt="Vista previa del programa" onload="URL.revokeObjectURL(this.src)">`}else box.innerHTML=`<span>PDF</span><b>${esc(file.name)}</b>`}
async function saveProgramUpload142(event,id){event.preventDefault();const button=event.target.querySelector('button.primary'),err=document.getElementById('programUploadError142'),file=document.getElementById('programFile142')?.files?.[0];if(!file||button.disabled)return;button.disabled=true;err.innerHTML='';try{const url=await uploadBoloFile(file,id);if(!url)throw Error('No se ha podido subir el archivo.');const {error}=await db.from('bolos').update({program_photo_url:url,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',session.user.id);if(error)throw error;await loadGigs();await loadHomeNextPasses();if(view==='gig'&&String(window.currentGigId)===String(id))await loadBoloExtras(id);closeModal();render()}catch(e){err.innerHTML=`<div class="error">${esc(e.message)}</div>`}finally{button.disabled=false}}

let avatarCrop142=null;
const profileModalBase142=modalProfile;
modalProfile=function(){profileModalBase142();const input=document.getElementById('avatarFile139'),preview=document.getElementById('avatarPreview140');if(!input||!preview||document.getElementById('avatarCropEditor142'))return;input.setAttribute('onchange','prepareAvatarCrop142(this)');const editor=document.createElement('div');editor.id='avatarCropEditor142';editor.className='avatar-crop-editor142';editor.innerHTML=`<div class="avatar-crop-frame142"></div><div class="avatar-crop-controls142" hidden><label>Ampliación<input id="avatarZoom142" type="range" min="1" max="3" step="0.05" value="1" oninput="setAvatarZoom142(this.value)"></label><div class="avatar-move142"><button type="button" onclick="moveAvatarCrop142(0,-.12)">↑</button><button type="button" onclick="moveAvatarCrop142(-.12,0)">←</button><button type="button" onclick="centerAvatarCrop142()">Centrar</button><button type="button" onclick="moveAvatarCrop142(.12,0)">→</button><button type="button" onclick="moveAvatarCrop142(0,.12)">↓</button></div><small>Amplía y desplaza la foto hasta encuadrarla a tu gusto.</small></div>`;preview.parentNode.insertBefore(editor,preview);editor.querySelector('.avatar-crop-frame142').append(preview)};
function prepareAvatarCrop142(input){const file=input?.files?.[0],preview=document.getElementById('avatarPreview140'),editor=document.getElementById('avatarCropEditor142');if(!file||!preview||!editor)return;if(avatarCrop142?.url)URL.revokeObjectURL(avatarCrop142.url);avatarCrop142={file,url:URL.createObjectURL(file),zoom:1,x:0,y:0};preview.src=avatarCrop142.url;preview.classList.remove('empty');editor.querySelector('.avatar-crop-controls142').hidden=false;editor.querySelector('#avatarZoom142').value='1';updateAvatarCropPreview142()}
function updateAvatarCropPreview142(){const preview=document.getElementById('avatarPreview140');if(!preview||!avatarCrop142)return;preview.style.objectPosition=`${50+avatarCrop142.x*50}% ${50+avatarCrop142.y*50}%`;preview.style.transform=`scale(${avatarCrop142.zoom})`}
function setAvatarZoom142(value){if(!avatarCrop142)return;avatarCrop142.zoom=Number(value);updateAvatarCropPreview142()}
function moveAvatarCrop142(x,y){if(!avatarCrop142)return;avatarCrop142.x=Math.max(-1,Math.min(1,avatarCrop142.x+x));avatarCrop142.y=Math.max(-1,Math.min(1,avatarCrop142.y+y));updateAvatarCropPreview142()}
function centerAvatarCrop142(){if(!avatarCrop142)return;avatarCrop142.x=0;avatarCrop142.y=0;avatarCrop142.zoom=1;const range=document.getElementById('avatarZoom142');if(range)range.value='1';updateAvatarCropPreview142()}
optimizeAvatar140=function(file){return new Promise((resolve,reject)=>{const state=avatarCrop142?.file===file?avatarCrop142:{file,zoom:1,x:0,y:0},url=state.url||URL.createObjectURL(file),image=new Image();image.onload=()=>{try{const side=Math.min(image.naturalWidth,image.naturalHeight)/Math.max(1,state.zoom||1),freeX=Math.max(0,image.naturalWidth-side),freeY=Math.max(0,image.naturalHeight-side),left=Math.max(0,Math.min(freeX,freeX/2+(state.x||0)*freeX/2)),top=Math.max(0,Math.min(freeY,freeY/2+(state.y||0)*freeY/2)),canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d',{alpha:false}).drawImage(image,left,top,side,side,0,0,512,512);canvas.toBlob(blob=>{if(!state.url)URL.revokeObjectURL(url);if(!blob)return reject(Error('No se pudo optimizar la foto.'));resolve(new File([blob],'avatar.webp',{type:'image/webp'}))},'image/webp',.78)}catch(e){if(!state.url)URL.revokeObjectURL(url);reject(e)}};image.onerror=()=>{if(!state.url)URL.revokeObjectURL(url);reject(Error('No se pudo leer la foto.'))};image.src=url})};

const NOTICE_RETENTION142=1000*60*60*24;
function notificationReadAt142(item){const target=String(item?.[3]||'');if(target==='release142')return Number(localStorage.getItem(releaseKey142())||0);return Number(notificationSeenMap141()[notificationSignature141(item)]||0)}
function notificationRead142(item){return notificationReadAt142(item)>0}
function notificationAvailable142(item){const seen=notificationReadAt142(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function markActivityItemsSeen142(items){if(!session?.user?.id)return;const seen=notificationSeenMap141(),now=Date.now();for(const item of items||[]){const target=String(item?.[3]||'');if(target==='release142')localStorage.setItem(releaseKey142(),String(now));else if(target==='release140')localStorage.setItem(releaseKey140(),'seen');else if(target==='release141')localStorage.setItem(releaseKey141(),'seen');else seen[notificationSignature141(item)]=now}const recent=Object.entries(seen).filter(([,at])=>Number(at)>now-NOTICE_RETENTION142).slice(-250);localStorage.setItem(notificationSeenKey141(),JSON.stringify(Object.fromEntries(recent)))}
const RITMO_RELEASE142={version:'1.42',title:'Programa y avisos mejorados',description:'Adjunta el programa desde la ficha, encuadra tu avatar y consulta los avisos leídos durante 24 horas.',changes:['El botón Adjuntar programa abre directamente la cámara, galería o selector de PDF.','La foto de perfil permite ampliar y reencuadrar antes de guardarla.','Las notificaciones leídas quedan consultables durante 24 horas y se distinguen visualmente de las nuevas.']};
function releaseKey142(){return `ritmo-release-${RITMO_RELEASE142.version}-${session?.user?.id||'guest'}`}

/* RITMO 1.43: encuadre táctil del avatar mediante arrastre y gesto de pellizco. */
let avatarCrop143=null;
const profileModalBase143=modalProfile;
modalProfile=function(){
  profileModalBase143();
  const input=document.getElementById('avatarFile139'),preview=document.getElementById('avatarPreview140'),oldEditor=document.getElementById('avatarCropEditor142');
  if(!input||!preview||document.getElementById('avatarCropTouch143'))return;
  const editor=document.createElement('div');
  editor.id='avatarCropTouch143';editor.className='avatar-crop-touch143';
  editor.innerHTML='<div id="avatarCropStage143" class="avatar-crop-stage143" aria-label="Encuadre de foto"><div class="avatar-crop-guide143"></div></div><p>Arrastra la foto para moverla. Usa dos dedos para ampliar o reducir.</p>';
  oldEditor?.parentNode?.insertBefore(editor,oldEditor);
  editor.querySelector('#avatarCropStage143').insertBefore(preview,editor.querySelector('.avatar-crop-guide143'));
  oldEditor?.remove();
  input.setAttribute('onchange','prepareAvatarTouch143(this)');
  bindAvatarCropTouch143(editor.querySelector('#avatarCropStage143'));
};
function prepareAvatarTouch143(input){
  const file=input?.files?.[0],preview=document.getElementById('avatarPreview140'),stage=document.getElementById('avatarCropStage143');
  if(!file||!preview||!stage)return;
  if(avatarCrop143?.url)URL.revokeObjectURL(avatarCrop143.url);
  avatarCrop143={file,url:URL.createObjectURL(file),zoom:1,x:0,y:0,width:0,height:0};
  preview.onload=()=>{avatarCrop143.width=preview.naturalWidth;avatarCrop143.height=preview.naturalHeight;updateAvatarTouch143()};
  preview.src=avatarCrop143.url;preview.classList.remove('empty');
}
function avatarCropLimits143(){
  const stage=document.getElementById('avatarCropStage143'),s=avatarCrop143;
  if(!stage||!s?.width||!s?.height)return {x:0,y:0};
  const side=stage.clientWidth||208,base=Math.max(side/s.width,side/s.height),scaledW=s.width*base*s.zoom,scaledH=s.height*base*s.zoom;
  return {x:Math.max(0,(scaledW-side)/2),y:Math.max(0,(scaledH-side)/2)};
}
function updateAvatarTouch143(){
  const preview=document.getElementById('avatarPreview140'),s=avatarCrop143;
  if(!preview||!s)return;
  const limit=avatarCropLimits143();
  s.x=Math.max(-limit.x,Math.min(limit.x,s.x));s.y=Math.max(-limit.y,Math.min(limit.y,s.y));
  preview.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.zoom})`;
}
function bindAvatarCropTouch143(stage){
  if(!stage||stage.dataset.bound)return;stage.dataset.bound='1';
  const pointers=new Map();let start=null;
  stage.addEventListener('pointerdown',e=>{if(!avatarCrop143)return;stage.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)start={type:'move',x:e.clientX,y:e.clientY,cropX:avatarCrop143.x,cropY:avatarCrop143.y};else if(pointers.size===2){const p=[...pointers.values()];start={type:'pinch',distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:avatarCrop143.zoom}}});
  stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!avatarCrop143)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(!start)return;if(pointers.size===1&&start.type==='move'){avatarCrop143.x=start.cropX+(e.clientX-start.x);avatarCrop143.y=start.cropY+(e.clientY-start.y)}else if(pointers.size===2&&start.type==='pinch'){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);avatarCrop143.zoom=Math.max(1,Math.min(4,start.zoom*(distance/start.distance)))}updateAvatarTouch143()});
  const end=e=>{pointers.delete(e.pointerId);if(pointers.size===1){const p=[...pointers.values()][0];start={type:'move',x:p.x,y:p.y,cropX:avatarCrop143?.x||0,cropY:avatarCrop143?.y||0}}else start=null};
  stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
}
optimizeAvatar140=function(file){return new Promise((resolve,reject)=>{
  const s=avatarCrop143?.file===file?avatarCrop143:{file,zoom:1,x:0,y:0},url=s.url||URL.createObjectURL(file),image=new Image();
  image.onload=()=>{try{const side=Math.min(image.naturalWidth,image.naturalHeight)/Math.max(1,s.zoom||1),freeX=Math.max(0,image.naturalWidth-side),freeY=Math.max(0,image.naturalHeight-side),stage=document.getElementById('avatarCropStage143'),display=stage?.clientWidth||208,base=Math.max(display/image.naturalWidth,display/image.naturalHeight),left=Math.max(0,Math.min(freeX,freeX/2-(s.x||0)/(base*(s.zoom||1)))),top=Math.max(0,Math.min(freeY,freeY/2-(s.y||0)/(base*(s.zoom||1)))),canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;canvas.getContext('2d',{alpha:false}).drawImage(image,left,top,side,side,0,0,512,512);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return reject(Error('No se pudo optimizar la foto.'));resolve(new File([blob],'avatar.webp',{type:'image/webp'}))},'image/webp',.78)}catch(e){URL.revokeObjectURL(url);reject(e)}};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo leer la foto.'))};image.src=url;
})};

/* RITMO 1.44: el encuadre solo aparece al elegir una imagen y permite alejarla. */
let avatarCrop144=null;
const profileModalBase144=modalProfile;
modalProfile=function(){
  profileModalBase144();
  const input=document.getElementById('avatarFile139'),thumb=document.getElementById('avatarPreview140'),editor=document.getElementById('avatarCropTouch143'),oldStage=document.getElementById('avatarCropStage143');
  if(!input||!thumb||!editor||!oldStage||editor.dataset.avatar144)return;
  editor.dataset.avatar144='1';
  editor.parentNode.insertBefore(thumb,editor);
  const stage=oldStage.cloneNode(false);stage.id='avatarCropStage144';stage.className='avatar-crop-stage143';
  stage.innerHTML='<img id="avatarWorkingPreview144" class="profile-avatar140" alt="Encuadre de la foto"><div class="avatar-crop-guide143"></div>';
  oldStage.replaceWith(stage);editor.hidden=true;
  input.setAttribute('onchange','prepareAvatarTouch144(this)');
  bindAvatarCropTouch144(stage);
};
function prepareAvatarTouch144(input){
  const file=input?.files?.[0],thumb=document.getElementById('avatarPreview140'),work=document.getElementById('avatarWorkingPreview144'),editor=document.getElementById('avatarCropTouch143');
  if(!file||!thumb||!work||!editor)return;
  if(avatarCrop144?.url)URL.revokeObjectURL(avatarCrop144.url);
  avatarCrop144={file,url:URL.createObjectURL(file),zoom:1,x:0,y:0,width:0,height:0};
  thumb.src=avatarCrop144.url;thumb.hidden=true;
  work.onload=()=>{avatarCrop144.width=work.naturalWidth;avatarCrop144.height=work.naturalHeight;updateAvatarTouch144()};
  work.src=avatarCrop144.url;editor.hidden=false;editor.closest('.modal')?.classList.add('avatar-editing144');
}
function avatarCropLimits144(){
  const stage=document.getElementById('avatarCropStage144'),s=avatarCrop144;
  if(!stage||!s?.width||!s?.height)return {x:0,y:0};
  const side=stage.clientWidth||300,base=Math.max(side/s.width,side/s.height),w=s.width*base*s.zoom,h=s.height*base*s.zoom;
  return {x:Math.max(0,(w-side)/2),y:Math.max(0,(h-side)/2)};
}
function updateAvatarTouch144(){
  const work=document.getElementById('avatarWorkingPreview144'),s=avatarCrop144;if(!work||!s)return;
  const limit=avatarCropLimits144();s.x=Math.max(-limit.x,Math.min(limit.x,s.x));s.y=Math.max(-limit.y,Math.min(limit.y,s.y));
  work.style.transform=`translate(${s.x}px,${s.y}px) scale(${s.zoom})`;
}
function bindAvatarCropTouch144(stage){
  const pointers=new Map();let start=null;
  stage.addEventListener('pointerdown',e=>{if(!avatarCrop144)return;stage.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)start={type:'move',x:e.clientX,y:e.clientY,cropX:avatarCrop144.x,cropY:avatarCrop144.y};else if(pointers.size===2){const p=[...pointers.values()];start={type:'pinch',distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:avatarCrop144.zoom}}});
  stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!avatarCrop144||!start)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&start.type==='move'){avatarCrop144.x=start.cropX+e.clientX-start.x;avatarCrop144.y=start.cropY+e.clientY-start.y}else if(pointers.size===2&&start.type==='pinch'){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);avatarCrop144.zoom=Math.max(.3,Math.min(4,start.zoom*distance/start.distance))}updateAvatarTouch144()});
  const end=e=>{pointers.delete(e.pointerId);if(pointers.size===1){const p=[...pointers.values()][0];start={type:'move',x:p.x,y:p.y,cropX:avatarCrop144?.x||0,cropY:avatarCrop144?.y||0}}else start=null};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
}
optimizeAvatar140=function(file){return new Promise((resolve,reject)=>{
  const s=avatarCrop144?.file===file?avatarCrop144:{file,zoom:1,x:0,y:0},url=s.url||URL.createObjectURL(file),image=new Image();
  image.onload=()=>{try{const stage=document.getElementById('avatarCropStage144'),display=stage?.clientWidth||300,base=Math.max(display/image.naturalWidth,display/image.naturalHeight),scale=base*(s.zoom||1),w=image.naturalWidth*scale,h=image.naturalHeight*scale,x=(display-w)/2+(s.x||0),y=(display-h)/2+(s.y||0),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});canvas.width=512;canvas.height=512;ctx.fillStyle='#edf2ed';ctx.fillRect(0,0,512,512);ctx.drawImage(image,x*512/display,y*512/display,w*512/display,h*512/display);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return reject(Error('No se pudo optimizar la foto.'));resolve(new File([blob],'avatar.webp',{type:'image/webp'}))},'image/webp',.78)}catch(e){URL.revokeObjectURL(url);reject(e)}};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo leer la foto.'))};image.src=url;
})};
function releaseUnread142(){return !notificationRead142(['✦','','','release142'])}
function openRelease142(){localStorage.setItem(releaseKey142(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE142.version}</div><h3>${RITMO_RELEASE142.title}</h3><p class="muted">${RITMO_RELEASE142.description}</p><ul class="release-list140">${RITMO_RELEASE142.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
activityFeed=function(){const items=activityPersistBase141();items.unshift(['✦',RITMO_RELEASE142.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE142.version+'.','release142']);return items.filter(notificationAvailable142)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead142(item)).length};
openActivity139=function(target){if(target==='release142'){openRelease142();return}if(target.startsWith('friends:'))goFriends136(target.slice(8));else go(target)};
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead142);markNotificationsSeen();markActivityItemsSeen142(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase142=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase142(gig,owed);if(releaseUnread142())items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE142.version+'.','openRelease142()']);return items};
const homeReleaseBase142=home;
home=function(){let html=homeReleaseBase142();if(releaseUnread142())html=html.replace('class="card today-center"','class="card today-center attention135"');return html};


/* RITMO 1.46: agenda mensual compacta y encuadre de avatar con más aire. */
function openAgendaCalendar146(){
  const upcoming=gigs.filter(g=>g.event_date>=localDate()&&g.status!=='cancelado').sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)))[0];
  const date=upcoming?.event_date||localDate();
  currentMonth=new Date(`${date}T12:00:00`);
  selectedDay=date;
  window.calendarMode='agenda';
  go('calendar');
}
const calendarBase146=calendar;
calendar=function(){
  const mode=window.calendarMode||'month',activeProject=window.calendarProjectFilter||'',today=localDate();
  if(mode!=='agenda')return calendarBase146();
  const projectOptions=projects.map(p=>`<option value="${p.id}" ${p.id===activeProject?'selected':''}>${esc(p.name)}</option>`).join('');
  const switcher=`<div class="calendar-switch"><button onclick="setCalendarMode('month')">▦ Mes</button><button class="active" onclick="setCalendarMode('agenda')">☷ Agenda</button></div>`;
  const toolbar=`<div class="toolbar agenda-toolbar146"><select onchange="setCalendarProject(this.value)"><option value="">Todos los proyectos</option>${projectOptions}</select></div>`;
  return `${pageTitle('Calendario')}${switcher}${toolbar}${agendaView146(today,activeProject)}`;
};
function agendaView146(today,activeProject){
  const rows=gigs.filter(g=>g.event_date>=today&&g.status!=='cancelado'&&(!activeProject||g.project_id===activeProject)).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)));
  if(!rows.length)return `<div class="empty-state"><span>♪</span><b>No hay próximos compromisos</b><p class="muted">Cuando añadas un bolo aparecerá aquí en orden cronológico.</p></div>`;
  const months={};
  rows.forEach(g=>{const month=String(g.event_date).slice(0,7);(months[month]??={})[g.event_date]??=[];months[month][g.event_date].push(g)});
  return Object.entries(months).map(([month,days])=>{
    const monthDate=new Date(`${month}-01T12:00:00`),monthLabel=monthDate.toLocaleDateString('es-ES',{month:'long',year:'numeric'});
    return `<section class="agenda-month146"><h2>${esc(monthLabel.charAt(0).toUpperCase()+monthLabel.slice(1))}</h2>${Object.entries(days).map(([date,items])=>{
      const d=new Date(`${date}T12:00:00`),weekday=d.toLocaleDateString('es-ES',{weekday:'short'}).replace('.',''),level=dayConflictLevel(items);
      return `<div class="agenda-day146"><div class="agenda-day-number146"><b>${String(d.getDate()).padStart(2,'0')}</b><span>${esc(weekday)}</span></div><div class="agenda-day-events146">${items.map(g=>{const p=projectById(g.project_id);return `<button class="agenda-event146 ${level?'agenda-conflict '+(level==='strong'?'strong':''):''}" onclick="goGig('${g.id}')"><i style="background:${esc(p.color||'#7b4bb7')}"></i><span><b>${esc(p.name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(boloStatusLabel(g.status))}</small></span>${level?`<em>${level==='strong'?'!':'+'}</em>`:''}</button>`}).join('')}</div></div>`}).join('')}</section>`;
  }).join('');
}

/* El encuadre parte de la foto completa: permite alejarla y después acercar con dos dedos. */
function avatarCropLimits144(){
  const stage=document.getElementById('avatarCropStage144'),s=avatarCrop144;
  if(!stage||!s?.width||!s?.height)return {x:0,y:0};
  const side=stage.clientWidth||300,base=Math.min(side/s.width,side/s.height),w=s.width*base*s.zoom,h=s.height*base*s.zoom;
  return {x:Math.max(0,(w-side)/2),y:Math.max(0,(h-side)/2)};
}
function bindAvatarCropTouch144(stage){
  const pointers=new Map();let start=null;
  stage.addEventListener('pointerdown',e=>{if(!avatarCrop144)return;stage.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)start={type:'move',x:e.clientX,y:e.clientY,cropX:avatarCrop144.x,cropY:avatarCrop144.y};else if(pointers.size===2){const p=[...pointers.values()];start={type:'pinch',distance:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y),zoom:avatarCrop144.zoom}}});
  stage.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!avatarCrop144||!start)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1&&start.type==='move'){avatarCrop144.x=start.cropX+e.clientX-start.x;avatarCrop144.y=start.cropY+e.clientY-start.y}else if(pointers.size===2&&start.type==='pinch'){const p=[...pointers.values()],distance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);avatarCrop144.zoom=Math.max(.45,Math.min(4,start.zoom*distance/start.distance))}updateAvatarTouch144()});
  const end=e=>{pointers.delete(e.pointerId);if(pointers.size===1){const p=[...pointers.values()][0];start={type:'move',x:p.x,y:p.y,cropX:avatarCrop144?.x||0,cropY:avatarCrop144?.y||0}}else start=null};stage.addEventListener('pointerup',end);stage.addEventListener('pointercancel',end);
}
optimizeAvatar140=function(file){return new Promise((resolve,reject)=>{
  const s=avatarCrop144?.file===file?avatarCrop144:{file,zoom:1,x:0,y:0},url=s.url||URL.createObjectURL(file),image=new Image();
  image.onload=()=>{try{const stage=document.getElementById('avatarCropStage144'),display=stage?.clientWidth||300,base=Math.min(display/image.naturalWidth,display/image.naturalHeight),scale=base*(s.zoom||1),w=image.naturalWidth*scale,h=image.naturalHeight*scale,x=(display-w)/2+(s.x||0),y=(display-h)/2+(s.y||0),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});canvas.width=512;canvas.height=512;ctx.fillStyle='#edf2ed';ctx.fillRect(0,0,512,512);ctx.drawImage(image,x*512/display,y*512/display,w*512/display,h*512/display);canvas.toBlob(blob=>{URL.revokeObjectURL(url);if(!blob)return reject(Error('No se pudo optimizar la foto.'));resolve(new File([blob],'avatar.webp',{type:'image/webp'}))},'image/webp',.78)}catch(e){URL.revokeObjectURL(url);reject(e)}};image.onerror=()=>{URL.revokeObjectURL(url);reject(Error('No se pudo leer la foto.'))};image.src=url;
})};

/* RITMO 1.47: aviso de versión único, visible en campana y Centro del día durante 24 horas. */
const RITMO_RELEASE147={version:'1.47',title:'RITMO se ha actualizado',description:'Agenda mensual más clara, avatar con más margen y una tarjeta de fechas corregida.',changes:['La tarjeta de Fechas de Inicio ya abre la Agenda mensual compacta sin recortar el texto.','La Agenda agrupa los bolos por mes y muestra los días con actuaciones de forma más ligera.','La foto de perfil parte de la imagen completa y se puede ajustar con más margen antes de guardarla.','Este aviso aparecerá en la campana y en Centro del día durante 24 horas después de consultarlo.']};
function releaseKey147(){return `ritmo-release-${RITMO_RELEASE147.version}-${session?.user?.id||'guest'}`}
function notificationReadAt147(item){return String(item?.[3]||'')==='release147'?Number(localStorage.getItem(releaseKey147())||0):notificationReadAt142(item)}
function notificationRead147(item){return notificationReadAt147(item)>0}
function notificationAvailable147(item){const seen=notificationReadAt147(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease147(){localStorage.setItem(releaseKey147(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE147.version}</div><h3>${RITMO_RELEASE147.title}</h3><p class="muted">${RITMO_RELEASE147.description}</p><ul class="release-list140">${RITMO_RELEASE147.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
function markActivityItemsSeen147(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release147');markActivityItemsSeen142(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release147'))localStorage.setItem(releaseKey147(),String(Date.now()))}
activityFeed=function(){const items=activityPersistBase141().filter(item=>!String(item?.[3]||'').startsWith('release'));items.unshift(['✦',RITMO_RELEASE147.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE147.version+'.','release147']);return items.filter(notificationAvailable147)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead147(item)).length};
openActivity139=function(target){if(target==='release147'){openRelease147();return}if(target.startsWith('friends:'))goFriends136(target.slice(8));else go(target)};
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead147);markNotificationsSeen();markActivityItemsSeen147(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase147=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase147(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead147(['✦','','','release147']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE147.version+'.','openRelease147()']);return items};

/* RITMO 1.48: el desplazamiento se calcula y se explica antes de guardar. */
const activeKmPriceBase148=activeKmPrice;
activeKmPrice=function(date,projectId=''){
  const day=String(date||localDate()).slice(0,10);
  const valid=(kmPrices||[]).filter(row=>{
    const rate=Number(row?.price_per_km);
    const from=String(row?.effective_from||'').slice(0,10);
    return Number.isFinite(rate)&&from&&from<=day;
  }).sort((a,b)=>String(b.effective_from||'').localeCompare(String(a.effective_from||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const selectedProject=String(projectId||'');
  const specific=selectedProject?valid.find(row=>String(row.project_id||'')===selectedProject):null;
  const general=valid.find(row=>!row.project_id);
  return Number((specific||general)?.price_per_km||0);
};
function updateTravelCalculation148(){
  const box=document.getElementById('travelCalculation148');
  if(!box)return;
  const kilometers=Math.max(0,Number(document.getElementById('bkm')?.value||0));
  const cache=Math.max(0,Number(document.getElementById('bprice')?.value||0));
  const charging=document.getElementById('btravel')?.value==='true';
  const rate=activeKmPrice(document.getElementById('bdate')?.value,document.getElementById('bproject')?.value);
  const travel=charging?kilometers*rate:0;
  box.classList.toggle('is-warning',charging&&kilometers>0&&rate<=0);
  if(!charging){box.textContent='El desplazamiento no se sumará al total.';return}
  if(kilometers>0&&rate<=0){box.textContent='No hay una tarifa por km vigente para este proyecto y esta fecha. Configúrala en Ajustes → Tarifas por km.';return}
  if(!kilometers){box.textContent=`Tarifa vigente: ${money(rate)}/km · Añade o calcula los kilómetros para ver el total.`;return}
  box.textContent=`Tarifa vigente: ${money(rate)}/km · Desplazamiento: ${money(travel)} · Total estimado: ${money(cache+travel)}`;
}
const modalBoloBase148=modalBolo;
modalBolo=function(id=''){
  modalBoloBase148(id);
  const travel=document.getElementById('btravel');
  if(travel){
    if(id)travel.dataset.userChoice148='1';
    travel.addEventListener('change',()=>{travel.dataset.userChoice148='1';updateTravelCalculation148()});
  }
  ['bproject','bdate','bprice','bkm'].forEach(field=>document.getElementById(field)?.addEventListener('input',updateTravelCalculation148));
  document.getElementById('bproject')?.addEventListener('change',updateTravelCalculation148);
  document.getElementById('bdate')?.addEventListener('change',updateTravelCalculation148);
  updateTravelCalculation148();
};
const calculateRouteFromFormBase148=calculateRouteFromForm;
calculateRouteFromForm=async function(){
  await calculateRouteFromFormBase148();
  const kilometers=Number(document.getElementById('bkm')?.value||0),travel=document.getElementById('btravel');
  if(kilometers>0&&travel&&!travel.dataset.userChoice148)travel.value='true';
  updateTravelCalculation148();
};
gigRow=function(g){
  const p=projectById(g.project_id),a=boloAmounts(g);
  const amountLabel=g.status==='reserva'?'Previsto':g.status==='cancelado'?'Cancelado':'Total';
  const displayTotal=g.status==='cancelado'?0:a.total;
  return `<button class="row-card project-rail1321" style="--project-color:${projectRailColor1321(g)}" onclick="goGig('${g.id}')"><span class="grow"><b>${esc(p.name)}</b><small>${esc(g.event_date)} · ${esc(g.location||'Ubicación pendiente')}</small><span class="bolo-money"><span>${amountLabel}</span><b>${money(displayTotal)}</b></span>${boloReadinessMarkup(g)}</span><span class="status ${boloStatusClass(g.status)}">${esc(boloStatusLabel(g.status))}</span><span class="arrow">›</span></button>`
};

/* RITMO 1.48: aviso de la mejora del cálculo de desplazamiento. */
const RITMO_RELEASE148={version:'1.48',title:'RITMO se ha actualizado',description:'El desplazamiento se calcula de forma más clara al crear o editar un bolo.',changes:['Al calcular una ruta nueva, el desplazamiento se activa automáticamente salvo que hayas elegido lo contrario.','El formulario muestra la tarifa vigente, el importe de desplazamiento y el total estimado antes de guardar.','Mis bolos muestra un único total, que suma caché y desplazamiento, sin el indicador de kilómetros.']};
function releaseKey148(){return `ritmo-release-${RITMO_RELEASE148.version}-${session?.user?.id||'guest'}`}
function notificationReadAt148(item){return String(item?.[3]||'')==='release148'?Number(localStorage.getItem(releaseKey148())||0):notificationReadAt147(item)}
function notificationRead148(item){return notificationReadAt148(item)>0}
function notificationAvailable148(item){const seen=notificationReadAt148(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease148(){localStorage.setItem(releaseKey148(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE148.version}</div><h3>${RITMO_RELEASE148.title}</h3><p class="muted">${RITMO_RELEASE148.description}</p><ul class="release-list140">${RITMO_RELEASE148.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
function markActivityItemsSeen148(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release148');markActivityItemsSeen147(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release148'))localStorage.setItem(releaseKey148(),String(Date.now()))}
activityFeed=function(){const items=activityPersistBase141().filter(item=>!String(item?.[3]||'').startsWith('release'));items.unshift(['✦',RITMO_RELEASE148.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE148.version+'.','release148']);return items.filter(notificationAvailable148)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead148(item)).length};
openActivity139=function(target){if(target==='release148'){openRelease148();return}if(target.startsWith('friends:'))goFriends136(target.slice(8));else go(target)};
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead148);markNotificationsSeen();markActivityItemsSeen148(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase148=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase148(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead148(['✦','','','release148']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE148.version+'.','openRelease148()']);return items};
const homeReleaseBase148=home;
home=function(){let html=homeReleaseBase148();if(!notificationRead148(['✦','','','release148']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* RITMO 1.49: avisos de bolos que abren su ficha y frases que cambian cada hora. */
const ritmoPhrases149=[
  'Hoy vas a tu… RITMO.','Recuerda: cada uno necesita su… RITMO.','Con calma, con música y a tu… RITMO.','Organiza el día. Disfruta el RITMO.','Si hay bolo, hay RITMO.','Todo entra mejor cuando vas a tu… RITMO.','Que el día suene a tu… RITMO.','Que el RITMO no pare, no pare, no…','Café, cables y a tu… RITMO.','Hoy el caos va con metrónomo.','Si llegas a tiempo, que no se note.','Un bolo a la vez. Y si hay dos, respira.','Afinado, organizado y con batería.','La prueba de sonido también cuenta como cardio.','No es prisa: es tempo allegro.','Todo bajo control. Más o menos.','La furgoneta sabe el camino. Tú lleva el RITMO.','Tu agenda tiene más compases que excusas.','Que no falte nada… salvo tiempo para montar.','Hoy toca. Y no solo música.','Respira: aún queda margen. Probablemente.','Un cable menos perdido, un día más feliz.','Llegar puntual también es una forma de arte.','Tu mejor solo empieza por saber dónde aparcar.','El bolo se disfruta más cuando el cable está en la maleta.','Primero el café. Después, el sonido.','Si el escenario tiembla, que sea por los graves.','El setlist está listo. Ahora que aparezca.','La puntualidad es rock and roll con agenda.','Hoy no hay caos: hay improvisación planificada.','El metrónomo aprueba esta planificación.','Un buen viaje empieza con una ruta y acaba con aplausos.','Que la música te pille preparado.','Menos prisas, más compás.','Todo bolo merece una entrada a tiempo.','Hoy toca dar la nota. La buena.','El volumen alto; los imprevistos, bajitos.','Cables recogidos, mente despejada.','Con una buena ruta, hasta el tráfico suena mejor.','Tu día tiene banda sonora.','La mejor afinación empieza en la agenda.','Que nunca falte música ni una regleta.','Si hay imprevisto, ponle compás.','Hoy el backstage también va a tu RITMO.','Ensayar es recordar que luego saldrá mejor.','Los aplausos se preparan desde aquí.','Sin prisa, pero sin perder el tempo.','Un bolo organizado suena distinto.','La carretera también forma parte del concierto.','Tú marca el compás; RITMO guarda el resto.','Que el único susto sea el solo de guitarra.','Hoy se monta, se toca y se celebra.','Una fecha clara vale por dos ensayos.','El escenario te espera. Ve a tu RITMO.','La agenda no desafina.','Que cada kilómetro tenga su canción.','Aquí los bolos no se escapan del calendario.','Más música, menos buscar mensajes antiguos.','El plan está afinado. Dale al play.'
];
dailySlogan140=function(){const hour=Math.floor(Date.now()/3600000);return ritmoPhrases149[Math.abs(hour)%ritmoPhrases149.length]};
let sloganHour149=Math.floor(Date.now()/3600000);
setInterval(()=>{const hour=Math.floor(Date.now()/3600000);if(hour!==sloganHour149){sloganHour149=hour;if(view==='home'&&!document.getElementById('modal'))render()}},60000);
function directGigActivity149(){
  const since=new Date(activityLastSeen()).getTime();
  const seen=notificationSeenMap141();
  const isVisible=item=>!seen[notificationSignature141(item)];
  const created=gigs.filter(g=>new Date(g.created_at||0).getTime()>since).map(g=>['♫','Bolo creado',`${projectById(g.project_id).name} · ${g.event_date}${g.location?' · '+g.location:''}`,`gig:${g.id}`]);
  const changed=gigs.filter(g=>{const createdAt=new Date(g.created_at||0).getTime(),updatedAt=new Date(g.updated_at||0).getTime();return createdAt<=since&&updatedAt>since&&updatedAt>createdAt+1000}).map(g=>['↻','Bolo actualizado',`${projectById(g.project_id).name} · ${g.event_date}${g.location?' · '+g.location:''}`,`gig:${g.id}`]);
  return [...created,...changed].filter(isVisible);
}
const RITMO_RELEASE149={version:'1.49',title:'RITMO se ha actualizado',description:'Las notificaciones de bolos ya abren la ficha correcta y las frases de Inicio se renuevan cada hora.',changes:['Cada aviso de bolo creado o actualizado abre directamente la ficha de esa actuación.','Inicio incorpora más frases de RITMO y cambia una por hora.','La colección combina recordatorios musicales, humor de carretera y guiños de escenario.']};
function releaseKey149(){return `ritmo-release-${RITMO_RELEASE149.version}-${session?.user?.id||'guest'}`}
function notificationReadAt149(item){return String(item?.[3]||'')==='release149'?Number(localStorage.getItem(releaseKey149())||0):notificationReadAt148(item)}
function notificationRead149(item){return notificationReadAt149(item)>0}
function notificationAvailable149(item){const seen=notificationReadAt149(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease149(){localStorage.setItem(releaseKey149(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE149.version}</div><h3>${RITMO_RELEASE149.title}</h3><p class="muted">${RITMO_RELEASE149.description}</p><ul class="release-list140">${RITMO_RELEASE149.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
function markActivityItemsSeen149(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release149');markActivityItemsSeen148(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release149'))localStorage.setItem(releaseKey149(),String(Date.now()))}
activityFeed=function(){
  const existing=activityPersistBase141().filter(item=>{const target=String(item?.[3]||'');return !target.startsWith('release')&&target!=='bolos'});
  const items=[...directGigActivity149(),...existing];
  items.unshift(['✦',RITMO_RELEASE149.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE149.version+'.','release149']);
  return items.filter(notificationAvailable149);
};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead149(item)).length};
openActivity139=function(target){if(target==='release149'){openRelease149();return}if(target.startsWith('gig:')){closeModal();goGig(target.slice(4));return}if(target.startsWith('friends:'))goFriends136(target.slice(8));else go(target)};
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead149);markNotificationsSeen();markActivityItemsSeen149(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase149=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase149(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead149(['✦','','','release149']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE149.version+'.','openRelease149()']);return items};
const homeReleaseBase149=home;
home=function(){let html=homeReleaseBase149();if(!notificationRead149(['✦','','','release149']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* RITMO 1.50: tarifa positiva fiable y Mis bolos en agenda mensual compacta. */
function kmRateRows150(date,projectId=''){
  const day=String(date||localDate()).slice(0,10);
  const rows=(kmPrices||[]).filter(row=>Number.isFinite(Number(row?.price_per_km))&&Number(row.price_per_km)>0).sort((a,b)=>String(b.effective_from||'').localeCompare(String(a.effective_from||''))||String(b.created_at||'').localeCompare(String(a.created_at||'')));
  const project=String(projectId||'');
  const specific=project?rows.filter(row=>String(row.project_id||'')===project):[];
  const general=rows.filter(row=>!row.project_id);
  const current=group=>group.find(row=>String(row.effective_from||'').slice(0,10)<=day);
  return {specific,general,currentSpecific:current(specific),currentGeneral:current(general)};
}
activeKmPrice=function(date,projectId=''){
  const rates=kmRateRows150(date,projectId);
  /* Una tarifa 0 significa «no aplicar tarifa». Si el bolo sí cobra desplazamiento,
     se utiliza la última tarifa positiva del proyecto o la general. */
  const chosen=rates.currentSpecific||rates.currentGeneral||rates.specific[0]||rates.general[0];
  return Number(chosen?.price_per_km||0);
};
function boloCompactRow150(g){
  const project=projectById(g.project_id)||{name:'Proyecto',color:'#7b4bb7'},readiness=boloReadiness(g),percent=readiness.total?Math.round(readiness.done/readiness.total*100):0;
  const date=new Date(`${g.event_date}T12:00:00`),day=String(date.getDate()).padStart(2,'0'),weekday=date.toLocaleDateString('es-ES',{weekday:'short'}).replace('.','');
  const amount=g.status==='cancelado'?0:boloAmounts(g).total;
  const label=g.status==='reserva'?'Previsto':'Total';
  return `<button class="bolo-agenda-row150 project-rail1321" style="--project-color:${esc(projectRailColor1321(g))}" onclick="goGig('${g.id}')"><span class="bolo-agenda-date150"><b>${day}</b><small>${esc(weekday)}</small></span><span class="bolo-agenda-copy150"><b>${esc(project.name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(boloStatusLabel(g.status))}</small><span class="bolo-agenda-meta150"><strong>${label} ${money(amount)}</strong><span class="bolo-agenda-progress150"><i style="width:${percent}%"></i></span><em>${percent}%</em></span></span><span class="arrow" aria-hidden="true">›</span></button>`;
}
function boloMonth150(month,rows){
  const now=localDate().slice(0,7),past=month<now,date=new Date(`${month}-01T12:00:00`),label=date.toLocaleDateString('es-ES',{month:'long',year:'numeric'}),title=label.charAt(0).toUpperCase()+label.slice(1);
  const confirmed=rows.filter(row=>row.status==='confirmado'),total=confirmed.reduce((sum,row)=>sum+boloAmounts(row).total,0);
  return `<details class="bolos-month150" ${past?'':'open'}><summary><span><b>${esc(title)}</b><small>${rows.length} ${rows.length===1?'bolo':'bolos'}</small></span><strong>${confirmed.length?money(total):'—'}</strong><span class="bolos-month-chevron150">⌄</span></summary><div class="bolos-month-list150">${rows.map(boloCompactRow150).join('')}</div></details>`;
}
bolosView=function(){
  const filter=window.bolosFilter||'activos',projectId=window.bolosProject||'',query=(window.ritmoBoloSearch131||'').trim().toLocaleLowerCase('es');
  const matched=gigs.filter(g=>{
    const project=projectById(g.project_id)||{name:''};
    return (!projectId||String(g.project_id)===String(projectId))&&(!query||`${g.location||''} ${project.name||''}`.toLocaleLowerCase('es').includes(query));
  }).filter(g=>filter==='cancelado'?g.status==='cancelado':g.status!=='cancelado');
  const groups={};
  matched.sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date))).forEach(g=>{const key=String(g.event_date).slice(0,7);(groups[key]??=[]).push(g)});
  const now=localDate().slice(0,7),keys=Object.keys(groups).sort((a,b)=>{const aPast=a<now,bPast=b<now;if(aPast!==bPast)return aPast?1:-1;return aPast?b.localeCompare(a):a.localeCompare(b)});
  const reservations=gigs.filter(g=>g.status==='reserva'&&(!projectId||String(g.project_id)===String(projectId))).length;
  return `${pageTitle('Mis bolos')}<p class="muted page-intro">Agenda de actuaciones por meses.</p><button class="bolos-reservations150" onclick="go('reservations')"><span>${navGlyph('reservations')}<b>Reservas</b></span><strong>${reservations} ›</strong></button><label class="bolo-search bolo-search150">Buscar por localidad o proyecto<input id="boloSearch131" type="search" value="${esc(window.ritmoBoloSearch131||'')}" oninput="searchBolos131(this.value)"></label><div class="toolbar"><select aria-label="Filtrar bolos por proyecto" onchange="window.bolosProject=this.value;render()"><option value="">Todos los proyectos</option>${projects.map(p=>`<option value="${esc(p.id)}" ${String(p.id)===String(projectId)?'selected':''}>${esc(p.name)}</option>`).join('')}</select></div><div class="filter-chips" aria-label="Estado del bolo"><button class="mini ${filter==='activos'?'active':''}" onclick="setBolosFilter('activos')">Activos <span>${matched.filter(g=>g.status!=='cancelado').length}</span></button><button class="mini ${filter==='cancelado'?'active':''}" onclick="setBolosFilter('cancelado')">Cancelados <span>${gigs.filter(g=>g.status==='cancelado').length}</span></button></div>${keys.length?keys.map(key=>boloMonth150(key,groups[key])).join(''):`<div class="empty-state"><span aria-hidden="true">♫</span><h2>No hay bolos con este filtro</h2><p class="muted">Prueba otro filtro o añade una nueva fecha.</p><button class="secondary" onclick="modalBolo()">＋ Añadir bolo</button></div>`}`;
};

const RITMO_RELEASE150={version:'1.50',title:'RITMO se ha actualizado',description:'El desplazamiento prioriza siempre una tarifa positiva y Mis bolos estrena vista de agenda mensual.',changes:['Una tarifa configurada a 0 ya no anula una tarifa positiva cuando el bolo cobra desplazamiento.','Mis bolos agrupa las actuaciones por mes en una lista más compacta.','Los meses pasados aparecen plegados y se abren al tocarlos.']};
function releaseKey150(){return `ritmo-release-${RITMO_RELEASE150.version}-${session?.user?.id||'guest'}`}
function notificationReadAt150(item){return String(item?.[3]||'')==='release150'?Number(localStorage.getItem(releaseKey150())||0):notificationReadAt149(item)}
function notificationRead150(item){return notificationReadAt150(item)>0}
function notificationAvailable150(item){const seen=notificationReadAt150(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease150(){localStorage.setItem(releaseKey150(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE150.version}</div><h3>${RITMO_RELEASE150.title}</h3><p class="muted">${RITMO_RELEASE150.description}</p><ul class="release-list140">${RITMO_RELEASE150.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
const activityBase150=activityFeed;
activityFeed=function(){const items=activityBase150().filter(item=>String(item?.[3]||'')!=='release149');items.unshift(['✦',RITMO_RELEASE150.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE150.version+'.','release150']);return items.filter(notificationAvailable150)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead150(item)).length};
const openActivityBase150=openActivity139;
openActivity139=function(target){if(target==='release150'){openRelease150();return}openActivityBase150(target)};
function markActivityItemsSeen150(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release150');markActivityItemsSeen149(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release150'))localStorage.setItem(releaseKey150(),String(Date.now()))}
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead150);markNotificationsSeen();markActivityItemsSeen150(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase150=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase150(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead150(['✦','','','release150']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE150.version+'.','openRelease150()']);return items};
const homeReleaseBase150=home;
home=function(){let html=homeReleaseBase150();if(!notificationRead150(['✦','','','release150']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* v1.51 — los cobros sin bolo se aplican en orden de antigüedad. */
function paymentsByBolo151(projectId){
  const projectKey=String(projectId||'');
  const rows=gigs.filter(g=>g.status==='confirmado'&&String(g.project_id)===projectKey)
    .sort((a,b)=>String(a.event_date||'').localeCompare(String(b.event_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)));
  const applied={};
  rows.forEach(g=>{
    applied[String(g.id)]=payments.filter(p=>String(p.bolo_id||'')===String(g.id))
      .reduce((sum,p)=>sum+Math.max(0,Number(p.amount||0)),0);
  });
  let automatic=payments.filter(p=>String(p.project_id||'')===projectKey&&!p.bolo_id)
    .sort((a,b)=>String(a.payment_date||'').localeCompare(String(b.payment_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||''))||String(a.id).localeCompare(String(b.id)))
    .reduce((sum,p)=>sum+Math.max(0,Number(p.amount||0)),0);
  rows.forEach(g=>{
    if(automatic<=0)return;
    const key=String(g.id),pending=Math.max(0,Number(boloAmounts(g).total||0)-Number(applied[key]||0));
    const assigned=Math.min(pending,automatic);
    applied[key]=Number(applied[key]||0)+assigned;
    automatic-=assigned;
  });
  return applied;
}
paymentTotalForBolo=function(id){
  const gig=gigs.find(g=>String(g.id)===String(id));
  if(!gig||gig.status!=='confirmado')return 0;
  return Number(paymentsByBolo151(gig.project_id)[String(gig.id)]||0);
};
paymentAllocationInfo=function(gig){
  if(gig?.status!=='confirmado')return 'No contabiliza';
  const hasExact=payments.some(p=>String(p.bolo_id||'')===String(gig.id));
  const hasAutomatic=payments.some(p=>String(p.project_id||'')===String(gig.project_id)&&!p.bolo_id);
  if(hasExact&&hasAutomatic)return 'Cobro asignado y saldo automático por antigüedad';
  if(hasExact)return 'Cobro asignado al bolo';
  if(hasAutomatic)return 'Cobro automático por antigüedad';
  return 'Sin cobros registrados';
};
paymentBoloOptions=function(projectId,selectedId=''){
  return gigs.filter(g=>g.status==='confirmado'&&String(g.project_id)===String(projectId||''))
    .sort((a,b)=>String(a.event_date||'').localeCompare(String(b.event_date||''))||String(a.created_at||'').localeCompare(String(b.created_at||'')))
    .map(g=>`<option value="${g.id}" ${String(g.id)===String(selectedId)?'selected':''}>${esc(g.event_date)} · ${esc(g.location||projectById(g.project_id).name)} · ${money(boloAmounts(g).total)}</option>`).join('');
};
const refreshPaymentBolosBase151=refreshPaymentBolos;
refreshPaymentBolos=function(selectId,projectId,selectedId=''){
  refreshPaymentBolosBase151(selectId,projectId,selectedId);
  const selector=document.getElementById(selectId);
  if(selector?.options?.[0])selector.options[0].textContent='Asignación automática: bolos más antiguos';
};
function updatePaymentAutomaticCopy151(){
  const modal=document.getElementById('modal');
  if(!modal)return;
  modal.querySelectorAll('p.muted').forEach(node=>{
    if(/proporcional|sin bolo/i.test(node.textContent))node.textContent='Si no eliges un bolo, RITMO aplicará el cobro al bolo confirmado más antiguo que todavía tenga saldo pendiente.';
  });
  modal.querySelectorAll('select').forEach(select=>{
    if((select.id==='paybolo'||select.id==='assignbolo')&&select.options[0])select.options[0].textContent='Asignación automática: bolos más antiguos';
  });
}
const modalCobroBase151=modalCobro;
modalCobro=function(...args){modalCobroBase151(...args);updatePaymentAutomaticCopy151()};
const modalAssignPaymentBase151=modalAssignPayment;
modalAssignPayment=function(...args){modalAssignPaymentBase151(...args);updatePaymentAutomaticCopy151()};

const RITMO_RELEASE151={version:'1.51',title:'RITMO se ha actualizado',description:'Los cobros automáticos ya se descuentan en orden, del bolo más antiguo al más reciente.',changes:['Un cobro sin bolo exacto cubre primero el saldo pendiente de la actuación confirmada más antigua.','Los cobros asignados expresamente a un bolo se mantienen en esa ficha.','La ayuda de registro de cobros explica la nueva asignación automática.']};
function releaseKey151(){return `ritmo-release-${RITMO_RELEASE151.version}-${session?.user?.id||'guest'}`}
function notificationReadAt151(item){return String(item?.[3]||'')==='release151'?Number(localStorage.getItem(releaseKey151())||0):notificationReadAt150(item)}
function notificationRead151(item){return notificationReadAt151(item)>0}
function notificationAvailable151(item){const seen=notificationReadAt151(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease151(){localStorage.setItem(releaseKey151(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE151.version}</div><h3>${RITMO_RELEASE151.title}</h3><p class="muted">${RITMO_RELEASE151.description}</p><ul class="release-list140">${RITMO_RELEASE151.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
const activityBase151=activityFeed;
activityFeed=function(){const items=activityBase151().filter(item=>String(item?.[3]||'')!=='release150');items.unshift(['✦',RITMO_RELEASE151.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE151.version+'.','release151']);return items.filter(notificationAvailable151)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead151(item)).length};
const openActivityBase151=openActivity139;
openActivity139=function(target){if(target==='release151'){openRelease151();return}openActivityBase151(target)};
function markActivityItemsSeen151(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release151');markActivityItemsSeen150(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release151'))localStorage.setItem(releaseKey151(),String(Date.now()))}
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead151);markNotificationsSeen();markActivityItemsSeen151(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase151=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase151(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead151(['✦','','','release151']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE151.version+'.','openRelease151()']);return items};
const homeReleaseBase151=home;
home=function(){let html=homeReleaseBase151();if(!notificationRead151(['✦','','','release151']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* v1.52 — ensayos sin alterar el modelo económico de los bolos confirmados. */
function isEssay152(g){return g?.readiness_options?.event_kind==='ensayo'}
function gigTypeLabel152(g){return isEssay152(g)?'Ensayo':boloStatusLabel(g.status)}
function essayTime152(g){return String(g?.readiness_options?.essay_time||'').slice(0,5)}
function formRow152(id){return document.getElementById(id)?.closest('label')}
const modalBoloBase152=modalBolo;
modalBolo=function(id=''){
  modalBoloBase152(id);
  const form=document.querySelector('#modal form'),gig=id?gigs.find(g=>String(g.id)===String(id)):null,status=document.getElementById('bstatus');
  if(!form||!status)return;
  const current=String(gig?.status||'confirmado');
  status.innerHTML=current==='cancelado'?'<option value="cancelado" selected>Cancelado</option>':'<option value="confirmado">Confirmado</option><option value="reserva">Reserva</option>';
  status.value=current==='reserva'?'reserva':current==='cancelado'?'cancelado':'confirmado';
  const statusRow=status.closest('label');
  statusRow.hidden=true;
  statusRow.insertAdjacentHTML('beforebegin',`<label id="bkindRow152">Tipo de fecha<select id="bkind152"><option value="bolo">Bolo</option><option value="reserva">Reserva</option><option value="ensayo">Ensayo</option></select></label>`);
  const route=document.querySelector('#modal .route-actions');
  route?.insertAdjacentHTML('beforebegin',`<label id="btimeRow152" hidden>Hora del ensayo<input id="btime152" type="time" value="${esc(essayTime152(gig))}"></label>`);
  const type=document.getElementById('bkind152');
  type.value=isEssay152(gig)?'ensayo':current==='reserva'?'reserva':'bolo';
  function sync(){
    const kind=type.value,essay=kind==='ensayo',reserve=kind==='reserva';
    if(status.querySelector(`option[value="${reserve?'reserva':'confirmado'}"]`))status.value=reserve?'reserva':'confirmado';
    if(typeof reservationMode134==='function')reservationMode134();
    document.getElementById('bkindRow152').hidden=false;
    statusRow.hidden=true;
    const title=document.querySelector('#modal h2'),button=form.querySelector('button.primary');
    if(essay){
      if(title)title.textContent=gig?'Editar ensayo':'Añadir ensayo';
      if(button)button.textContent=gig?'Guardar cambios':'Guardar ensayo';
      document.getElementById('btimeRow152').hidden=false;
      for(const field of ['bhome','bsleep','bfile','bobs']){const row=formRow152(field);if(row)row.hidden=true}
      const price=formRow152('bprice'),km=formRow152('bkm'),travel=formRow152('btravel');
      if(price){price.hidden=false;price.firstChild.textContent='Precio del ensayo (opcional)'}
      if(km){km.hidden=false;km.firstChild.textContent='Kilómetros (opcional)'}
      if(travel){travel.hidden=false;travel.firstChild.textContent='Cobrar desplazamiento?'}
      if(!gig&&form.dataset.essayPriceSet!=='1'){document.getElementById('bprice').value='0';form.dataset.essayPriceSet='1'}
      const note=form.querySelector('.travel-charge-note');if(note)note.hidden=false;
      const result=document.getElementById('routeResult');if(result)result.hidden=false;
      route?.removeAttribute('hidden');
      updateDateConflict(gig?.id||'');
      return;
    }
    document.getElementById('btimeRow152').hidden=true;
    if(!reserve){
      for(const field of ['bhome','bsleep','bfile','bobs']){const row=formRow152(field);if(row)row.hidden=false}
      for(const field of ['bprice','bkm','btravel']){const row=formRow152(field);if(row)row.hidden=false}
      const price=formRow152('bprice'),km=formRow152('bkm');if(price)price.firstChild.textContent='Precio del bolo';if(km)km.firstChild.textContent='Kilómetros';
    }
  }
  type.addEventListener('change',sync);sync();
};
const departureRecommendationBase152=departureRecommendation;
departureRecommendation=function(g,passes){
  if(!isEssay152(g))return departureRecommendationBase152(g,passes);
  const time=essayTime152(g),travel=travelInfo(g);
  if(!time||!travel.minutes)return null;
  const [hour,minute]=time.split(':').map(Number);
  return {first:time,departure:minutesToClock(hour*60+minute-travel.minutes),travel:travel.minutes,margin:0};
};
const boloReadinessBase152=boloReadiness;
boloReadiness=function(g){
  if(!isEssay152(g))return boloReadinessBase152(g);
  const steps=[['Ubicación',hasCoordinates(g)],['Hora del ensayo',Boolean(essayTime152(g))]];
  const missing=steps.filter(step=>!step[1]).map(step=>step[0]);
  return {steps,done:steps.length-missing.length,total:steps.length,missing};
};
const saveBoloBase152=saveBolo;
saveBolo=async function(event,id=''){
  const form=event.target;
  if(document.getElementById('bkind152')?.value!=='ensayo')return saveBoloBase152(event,id);
  event.preventDefault();
  if(form.dataset.saving)return;
  form.dataset.saving='1';
  const button=form.querySelector('button.primary'),initial=button?.textContent,errorBox=document.getElementById('boloError');
  if(button){button.disabled=true;button.textContent='Guardando…'}
  if(errorBox)errorBox.innerHTML='';
  try{
    const existing=id?gigs.find(g=>String(g.id)===String(id)):null,location=document.getElementById('blocation').value.trim(),time=document.getElementById('btime152').value;
    if(!location)throw Error('Añade el lugar del ensayo.');
    if(!time)throw Error('Indica la hora del ensayo para calcular la salida.');
    let geo=hasCoordinates(existing)?{lat:Number(existing.latitude),lon:Number(existing.longitude)}:null;
    if(!existing||existing.location!==location||!geo){geo=await geocodeLocation(location);if(!geo)throw Error('No se ha podido situar esta ubicación. Revisa el nombre de la localidad.')}
    const kilometers=Math.max(0,Number(document.getElementById('bkm').value||0)),speed=Number(window.userSettings?.average_speed_kmh||0),estimate=routeForSave133(existing,location,kilometers),minutes=estimate?Number(estimate.minutes):(speed>0&&kilometers>0?Math.round(kilometers/2/speed*60):null);
    const data={user_id:session.user.id,project_id:document.getElementById('bproject').value,event_date:document.getElementById('bdate').value,status:'confirmado',location,latitude:geo.lat,longitude:geo.lon,bolo_price:Math.max(0,Number(document.getElementById('bprice').value||0)),includes_travel:document.getElementById('btravel').value==='true',kilometers,returns_home:true,sleep_location:'',travel_minutes:minutes,observations:'',readiness_options:{...existing?.readiness_options,event_kind:'ensayo',essay_time:time,route_estimate:estimate}};
    if(!data.event_date)throw Error('Indica el día del ensayo.');
    const result=existing?await db.from('bolos').update(data).eq('id',existing.id).eq('user_id',session.user.id).select().single():await db.rpc('ritmo_create_bolo',{p_data:data,p_key:form.dataset.requestKey134||(form.dataset.requestKey134=crypto.randomUUID()),p_allow_duplicate:document.getElementById('allowDuplicate134')?.checked===true});
    if(result.error)throw result.error;
    form.dataset.savedBoloId=result.data.id;
    closeModal();await loadGigs();await loadHomeNextPasses();if(typeof rememberPlace134==='function')rememberPlace134();render();
  }catch(error){if(errorBox)errorBox.innerHTML=`<div class="error">${esc(error.message||String(error))}</div>`}
  finally{form.dataset.saving='';if(button?.isConnected){button.disabled=false;button.textContent=initial}}
};
const detailBase152=detail;
detail=function(id){
  const gig=gigs.find(g=>String(g.id)===String(id));let html=detailBase152(id);
  if(!isEssay152(gig))return html;
  const time=essayTime152(gig),travel=travelInfo(gig),departure=departureRecommendation(gig,[]);
  const section=`<section class="card essential-passes essay-time-card152"><h3>Hora del ensayo</h3><div class="line"><span>Empieza</span><b>${esc(time||'Pendiente')}</b></div><div class="line"><span>Salida recomendada</span><b>${departure?esc(departure.departure):'Configura kilómetros o ruta'}</b></div><p class="muted">El ensayo no añade margen previo: la salida se calcula solo con el tiempo de ida${travel.minutes?' ('+travel.minutes+' min)':''}.</p></section>`;
  html=html.replace(/<section class="card essential-passes">[\s\S]*?<\/section>/,section);
  return html.replace('<div class="muted">'+esc(gig.event_date)+'</div>','<div class="muted">'+esc(gig.event_date)+' · <b>Ensayo</b></div>');
};
function boloCompactRow152(g){
  const project=projectById(g.project_id)||{name:'Proyecto'},readiness=boloReadiness(g),percent=readiness.total?Math.round(readiness.done/readiness.total*100):0,date=new Date(`${g.event_date}T12:00:00`),day=String(date.getDate()).padStart(2,'0'),weekday=date.toLocaleDateString('es-ES',{weekday:'short'}).replace('.',''),amount=g.status==='cancelado'?0:boloAmounts(g).total,label=g.status==='reserva'?'Previsto':'Total';
  return `<button class="bolo-agenda-row150 project-rail1321" style="--project-color:${esc(projectRailColor1321(g))}" onclick="goGig('${g.id}')"><span class="bolo-agenda-date150"><b>${day}</b><small>${esc(weekday)}</small></span><span class="bolo-agenda-copy150"><b>${esc(project.name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(gigTypeLabel152(g))}</small><span class="bolo-agenda-meta150"><strong>${label} ${money(amount)}</strong><span class="bolo-agenda-progress150"><i style="width:${percent}%"></i></span><em>${percent}%</em></span></span><span class="arrow" aria-hidden="true">›</span></button>`;
}
boloCompactRow150=boloCompactRow152;

const RITMO_RELEASE152={version:'1.52',title:'RITMO se ha actualizado',description:'Ya puedes registrar ensayos con su hora, importe y desplazamiento.',changes:['Al crear una fecha, Cancelado ya no aparece como opción: una reserva se cancela desde su gestión.','Ensayo incluye día, lugar, hora, precio opcional y kilómetros con cálculo de ruta.','Los ensayos con importe o desplazamiento generan un saldo a cobrar y su salida no añade margen previo.']};
function releaseKey152(){return `ritmo-release-${RITMO_RELEASE152.version}-${session?.user?.id||'guest'}`}
function notificationReadAt152(item){return String(item?.[3]||'')==='release152'?Number(localStorage.getItem(releaseKey152())||0):notificationReadAt151(item)}
function notificationRead152(item){return notificationReadAt152(item)>0}
function notificationAvailable152(item){const seen=notificationReadAt152(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease152(){localStorage.setItem(releaseKey152(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE152.version}</div><h3>${RITMO_RELEASE152.title}</h3><p class="muted">${RITMO_RELEASE152.description}</p><ul class="release-list140">${RITMO_RELEASE152.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
const activityBase152=activityFeed;
activityFeed=function(){const items=activityBase152().filter(item=>String(item?.[3]||'')!=='release151');items.unshift(['✦',RITMO_RELEASE152.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE152.version+'.','release152']);return items.filter(notificationAvailable152)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead152(item)).length};
const openActivityBase152=openActivity139;
openActivity139=function(target){if(target==='release152'){openRelease152();return}openActivityBase152(target)};
function markActivityItemsSeen152(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release152');markActivityItemsSeen151(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release152'))localStorage.setItem(releaseKey152(),String(Date.now()))}
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead152);markNotificationsSeen();markActivityItemsSeen152(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase152=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase152(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead152(['✦','','','release152']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE152.version+'.','openRelease152()']);return items};
const homeReleaseBase152=home;
home=function(){let html=homeReleaseBase152();if(!notificationRead152(['✦','','','release152']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};

/* Etiquetas de ensayo en todas las consultas de agenda. */
const gigRowBase152=gigRow;
gigRow=function(g){
  const project=projectById(g.project_id),amounts=boloAmounts(g),amountLabel=g.status==='reserva'?'Previsto':g.status==='cancelado'?'Cancelado':'Total',displayTotal=g.status==='cancelado'?0:amounts.total,type=gigTypeLabel152(g);
  return `<button class="row-card project-rail1321" style="--project-color:${projectRailColor1321(g)}" onclick="goGig('${g.id}')"><span class="grow"><b>${esc(project.name)}</b><small>${esc(g.event_date)} · ${esc(g.location||'Ubicación pendiente')} · ${esc(type)}</small><span class="bolo-money"><span>${amountLabel}</span><b>${money(displayTotal)}</b></span>${boloReadinessMarkup(g)}</span><span class="status ${boloStatusClass(g.status)}">${esc(type)}</span><span class="arrow">›</span></button>`;
};
homeUpcoming139=function(){
  const rows=gigs.filter(g=>g.event_date>=localDate()&&g.status!=='cancelado').sort((a,b)=>a.event_date.localeCompare(b.event_date)).slice(0,4);
  return `<section class="card upcoming-simple139"><div class="card-head"><b>Próximas fechas</b><span class="arrow">›</span></div>${rows.map(g=>{const read=boloReadiness(g),percent=read.total?Math.round(read.done/read.total*100):0;return `<button class="upcoming-row139" onclick="goGig('${g.id}')"><span class="upcoming-date139">${new Date(g.event_date+'T12:00:00').toLocaleDateString('es-ES',{day:'numeric',month:'short'})}</span><span class="upcoming-info139"><b>${esc(projectById(g.project_id).name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(gigTypeLabel152(g))}</small><span class="upcoming-progress139"><span style="width:${percent}%"></span></span><small>Ficha ${percent}% completa</small></span><span class="arrow" aria-hidden="true">›</span></button>`}).join('')||'<p class="muted">Todavía no hay fechas próximas.</p>'}</section>`;
};
function agendaView152(today,activeProject){
  const rows=gigs.filter(g=>g.event_date>=today&&g.status!=='cancelado'&&(!activeProject||g.project_id===activeProject)).sort((a,b)=>String(a.event_date).localeCompare(String(b.event_date)));
  if(!rows.length)return `<div class="empty-state"><span>♪</span><b>No hay próximas fechas</b><p class="muted">Cuando añadas un bolo o un ensayo aparecerá aquí en orden cronológico.</p></div>`;
  const months={};rows.forEach(g=>{const month=String(g.event_date).slice(0,7);(months[month]??={})[g.event_date]??=[];months[month][g.event_date].push(g)});
  return Object.entries(months).map(([month,days])=>{const date=new Date(`${month}-01T12:00:00`),label=date.toLocaleDateString('es-ES',{month:'long',year:'numeric'});return `<section class="agenda-month146"><h2>${esc(label.charAt(0).toUpperCase()+label.slice(1))}</h2>${Object.entries(days).map(([day,items])=>{const d=new Date(`${day}T12:00:00`),weekday=d.toLocaleDateString('es-ES',{weekday:'short'}).replace('.',''),level=dayConflictLevel(items);return `<div class="agenda-day146"><div class="agenda-day-number146"><b>${String(d.getDate()).padStart(2,'0')}</b><span>${esc(weekday)}</span></div><div class="agenda-day-events146">${items.map(g=>{const project=projectById(g.project_id);return `<button class="agenda-event146 ${level?'agenda-conflict '+(level==='strong'?'strong':''):''}" onclick="goGig('${g.id}')"><i style="background:${esc(project.color||'#7b4bb7')}"></i><span><b>${esc(project.name)}</b><small>${esc(g.location||'Ubicación pendiente')} · ${esc(gigTypeLabel152(g))}</small></span>${level?`<em>${level==='strong'?'!':'+'}</em>`:''}</button>`}).join('')}</div></div>`}).join('')}</section>`}).join('');
}
agendaView146=agendaView152;

/* v1.53 — los ensayos se reconocen al instante en Mis bolos. */
function boloCompactRow153(g){
  const project=projectById(g.project_id)||{name:'Proyecto'},readiness=boloReadiness(g),percent=readiness.total?Math.round(readiness.done/readiness.total*100):0,date=new Date(`${g.event_date}T12:00:00`),day=String(date.getDate()).padStart(2,'0'),weekday=date.toLocaleDateString('es-ES',{weekday:'short'}).replace('.',''),amount=g.status==='cancelado'?0:boloAmounts(g).total,label=g.status==='reserva'?'Previsto':'Total',essay=isEssay152(g);
  return `<button class="bolo-agenda-row150 project-rail1321 ${essay?'is-essay153':''}" style="--project-color:${esc(projectRailColor1321(g))}" onclick="goGig('${g.id}')"><span class="bolo-agenda-date150"><b>${day}</b><small>${esc(weekday)}</small></span><span class="bolo-agenda-copy150"><b>${esc(project.name)}</b><small>${essay?'<strong class="essay-tag153">Ensayo</strong> · ':''}${esc(g.location||'Ubicación pendiente')} · ${esc(gigTypeLabel152(g))}</small><span class="bolo-agenda-meta150"><strong>${label} ${money(amount)}</strong><span class="bolo-agenda-progress150"><i style="width:${percent}%"></i></span><em>${percent}%</em></span></span><span class="arrow" aria-hidden="true">›</span></button>`;
}
boloCompactRow150=boloCompactRow153;
const RITMO_RELEASE153={version:'1.53',title:'RITMO se ha actualizado',description:'Los ensayos ya se distinguen visualmente en Mis bolos.',changes:['Las tarjetas de ensayo usan un sombreado ámbar suave.','La etiqueta Ensayo queda visible junto a la localidad.','El color lateral del proyecto se mantiene para identificar el grupo.']};
function releaseKey153(){return `ritmo-release-${RITMO_RELEASE153.version}-${session?.user?.id||'guest'}`}
function notificationReadAt153(item){return String(item?.[3]||'')==='release153'?Number(localStorage.getItem(releaseKey153())||0):notificationReadAt152(item)}
function notificationRead153(item){return notificationReadAt153(item)>0}
function notificationAvailable153(item){const seen=notificationReadAt153(item);return !seen||Date.now()-seen<NOTICE_RETENTION142}
function openRelease153(){localStorage.setItem(releaseKey153(),String(Date.now()));closeModal();render();socialModal133('Novedades de RITMO',`<div class="release-badge140">v${RITMO_RELEASE153.version}</div><h3>${RITMO_RELEASE153.title}</h3><p class="muted">${RITMO_RELEASE153.description}</p><ul class="release-list140">${RITMO_RELEASE153.changes.map(change=>`<li>${esc(change)}</li>`).join('')}</ul><button class="primary" onclick="closeModal();render()">Entendido</button>`)}
const activityBase153=activityFeed;
activityFeed=function(){const items=activityBase153().filter(item=>String(item?.[3]||'')!=='release152');items.unshift(['✦',RITMO_RELEASE153.title,'Descubre qué ha cambiado en la versión '+RITMO_RELEASE153.version+'.','release153']);return items.filter(notificationAvailable153)};
activityAlertCount=function(){return activityFeed().filter(item=>!notificationRead153(item)).length};
const openActivityBase153=openActivity139;
openActivity139=function(target){if(target==='release153'){openRelease153();return}openActivityBase153(target)};
function markActivityItemsSeen153(items){const normal=(items||[]).filter(item=>String(item?.[3]||'')!=='release153');markActivityItemsSeen152(normal);if((items||[]).some(item=>String(item?.[3]||'')==='release153'))localStorage.setItem(releaseKey153(),String(Date.now()))}
openNotifications=function(){const feed=activityFeed(),wasRead=feed.map(notificationRead153);markNotificationsSeen();markActivityItemsSeen153(feed);document.body.insertAdjacentHTML('beforeend',`<div class="modal-bg" id="modal"><div class="modal activity-modal"><div class="modal-head"><div><h2>Notificaciones</h2><div class="muted">Las leídas se conservan durante 24 horas.</div></div><button onclick="closeModal();render()">✕</button></div>${feed.length?`<div class="activity-list">${feed.map((item,index)=>`<button class="activity-item ${wasRead[index]?'is-read142':''}" onclick="openActivity139('${esc(item[3])}')"><span class="activity-icon">${item[0]}</span><div><b>${item[1]}</b><span>${item[2]}</span>${wasRead[index]?'<em>Leída</em>':'<em>Nueva</em>'}</div><span aria-hidden="true">›</span></button>`).join('')}</div>`:`<div class="activity-empty">✓<br><br>No hay novedades recientes.</div>`}</div></div>`) };
const todayReleaseBase153=todayCenter;
todayCenter=function(gig,owed){const items=todayReleaseBase153(gig,owed).filter(item=>!String(item?.[3]||'').includes('openRelease'));if(!notificationRead153(['✦','','','release153']))items.unshift(['✦','Hay novedades en RITMO','Consulta los cambios de la versión '+RITMO_RELEASE153.version+'.','openRelease153()']);return items};
const homeReleaseBase153=home;
home=function(){let html=homeReleaseBase153();if(!notificationRead153(['✦','','','release153']))html=html.replace('class="card today-center"','class="card today-center attention135"');return html};
