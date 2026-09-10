async function data(response){const body=await response.json().catch(()=>({}));if(!response.ok||body.ok===false)throw new Error(body.error||`Course request failed (${response.status})`);return body}
export async function loadCourses({editor=false}={}){return (await data(await fetch(`/api/courses${editor?'?editor=1':''}`,{credentials:'same-origin'}))).items||[]}
export async function loadCourse(slug,{editor=false}={}){const p=new URLSearchParams({slug});if(editor)p.set('editor','1');return (await data(await fetch(`/api/courses?${p}`,{credentials:'same-origin'}))).item}
export async function saveCourse(item){return (await data(await fetch('/api/courses',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({item})}))).item}
export async function removeCourse(id){return data(await fetch('/api/courses',{method:'DELETE',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({id})}))}
