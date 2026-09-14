const ARCHIVE=(window.CREMA_ARCHIVE||[]).sort((a,b)=>b.id.localeCompare(a.id));
const page=document.body.dataset.page;
const params=new URLSearchParams(location.search);
const selectedId=params.get("date");
const DATA=ARCHIVE.find(x=>x.id===selectedId)||ARCHIVE[0];

function dated(path){return `${path}?date=${DATA.id}`}
document.querySelectorAll("[data-updated]").forEach(el=>el.textContent=DATA.updated);
document.querySelector(`[data-nav="${page}"]`)?.classList.add("active");
document.querySelectorAll(".topbar a").forEach(a=>{const href=a.getAttribute("href");if(href?.endsWith(".html"))a.href=dated(href)});

function archiveBar(){
  const wrap=document.createElement("div");wrap.className="archivebar";
  const idx=ARCHIVE.findIndex(x=>x.id===DATA.id),newer=ARCHIVE[idx-1],older=ARCHIVE[idx+1];
  wrap.innerHTML=`<div class="archive-inner"><b>날짜별 브리핑</b><div class="archive-controls"><a class="day-move ${older?"":"disabled"}" href="${older?datedFor(older.id):"#"}">← 이전</a><select aria-label="브리핑 날짜">${ARCHIVE.map((d,i)=>`<option value="${d.id}" ${d.id===DATA.id?"selected":""}>${formatDate(d.id)}${i===0?" · 최신":""}</option>`).join("")}</select><a class="day-move ${newer?"":"disabled"}" href="${newer?datedFor(newer.id):"#"}">다음 →</a></div></div>`;
  wrap.querySelector("select").addEventListener("change",e=>location.href=datedFor(e.target.value));
  document.querySelector(".topbar").after(wrap);
}
function datedFor(id){return `${location.pathname.split("/").pop()||"index.html"}?date=${id}`}
function formatDate(id){const d=new Date(`${id}T00:00:00`);return `${d.getMonth()+1}월 ${d.getDate()}일 ${["일","월","화","수","목","금","토"][d.getDay()]}요일`}

function card(item){const cls=item.level.toLowerCase();return `<article class="feed-card"><div class="meta"><span class="level ${cls}">${item.level}</span><time>${item.date}</time><small>${item.sourceType}</small></div><div class="feed-main"><h2>${item.title}</h2><p class="summary">${item.summary}</p><div class="analysis"><b>MD VIEW</b><p>${item.analysis}</p></div><div class="tags">${item.tags.map(t=>`<span># ${t}</span>`).join("")}</div><div class="links">${item.links.map(l=>`<a href="${l.url}" target="_blank" rel="noopener">${l.label} ↗</a>`).join("")}</div></div></article>`}

function renderHome(){
  document.querySelector("[data-date-title]").textContent=formatDate(DATA.id);
  document.querySelector("[data-headline]").textContent=DATA.headline;
  document.querySelector("[data-hubs]").innerHTML=Object.entries(DATA.categories).map(([key,c],i)=>`<a class="hub-card" href="${dated(`${key}.html`)}"><span class="hub-no">0${i+1}</span><h2>${c.title}</h2><p>${c.description}</p><div class="hub-count"><div><strong>${c.items.length}</strong><span>개의 새 신호</span></div><span class="arrow">↗</span></div></a>`).join("");
  document.querySelector("[data-actions]").innerHTML=DATA.actions.map((a,i)=>`<li><b>0${i+1}</b><span>${a}</span></li>`).join("");
  const top=Object.values(DATA.categories).flatMap(c=>c.items).find(x=>x.level==="BURST");
  document.querySelector("[data-insight]").textContent=top?.analysis||DATA.headline;
}

function renderFeed(){
  const category=DATA.categories[page];document.querySelector("[data-title]").textContent=category.title;document.querySelector("[data-desc]").textContent=category.description;
  const tags=["전체",...new Set(category.items.flatMap(x=>x.tags))],filters=document.querySelector("[data-filters]"),feed=document.querySelector("[data-feed]");
  const draw=tag=>feed.innerHTML=category.items.filter(x=>tag==="전체"||x.tags.includes(tag)).map(card).join("");
  filters.innerHTML=tags.map((t,i)=>`<button class="${i===0?"active":""}" data-tag="${t}">${t}</button>`).join("");
  filters.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;filters.querySelectorAll("button").forEach(x=>x.classList.remove("active"));b.classList.add("active");draw(b.dataset.tag)});draw("전체");
}

archiveBar();page==="home"?renderHome():renderFeed();
