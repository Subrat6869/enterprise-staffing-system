import{c as s,r as a}from"./index-C9NU9W2H.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401",key:"kfwtm"}]],m=s("moon",c);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const d=[["circle",{cx:"12",cy:"12",r:"4",key:"4exip2"}],["path",{d:"M12 2v2",key:"tus03m"}],["path",{d:"M12 20v2",key:"1lh1kg"}],["path",{d:"m4.93 4.93 1.41 1.41",key:"149t6j"}],["path",{d:"m17.66 17.66 1.41 1.41",key:"ptbguv"}],["path",{d:"M2 12h2",key:"1t8f8n"}],["path",{d:"M20 12h2",key:"1q8mjw"}],["path",{d:"m6.34 17.66-1.41 1.41",key:"1m8zz5"}],["path",{d:"m19.07 4.93-1.41 1.41",key:"1shlcs"}]],l=s("sun",d),u=()=>{const[t,o]=a.useState(()=>{const e=localStorage.getItem("darkMode");return e!==null?JSON.parse(e):window.matchMedia("(prefers-color-scheme: dark)").matches});return a.useEffect(()=>{localStorage.setItem("darkMode",JSON.stringify(t)),t?document.documentElement.classList.add("dark"):document.documentElement.classList.remove("dark")},[t]),{isDarkMode:t,toggleDarkMode:()=>{o(e=>!e)},setDarkMode:e=>{o(e)}}};export{m as M,l as S,u};
