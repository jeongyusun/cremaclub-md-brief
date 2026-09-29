const els={
  query:document.getElementById('bookQuery'),
  search:document.getElementById('searchBtn'),
  status:document.getElementById('status'),
  title:document.getElementById('titleInput'),
  author:document.getElementById('authorInput'),
  publisher:document.getElementById('publisherInput'),
  cover:document.getElementById('coverInput'),
  cardTitle:document.getElementById('cardTitle'),
  cardAuthor:document.getElementById('cardAuthor'),
  cardPublisher:document.getElementById('cardPublisher'),
  cardCover:document.getElementById('cardCover'),
  cardDate:document.getElementById('cardDate'),
  reset:document.getElementById('resetBtn'),
  openYes24:document.getElementById('openYes24Btn')
};

let currentGoodsNo='147562506';

const DEFAULTS={
  title:'포크너 자선 단편집 1',
  author:'윌리엄 포크너',
  publisher:'서커스(서커스출판상회)',
  cover:'https://image.yes24.com/goods/147562506/XL',
  goodsNo:'147562506'
};

const pad=n=>String(n).padStart(2,'0');
const now=new Date();
els.cardDate.textContent=now.getFullYear()+'.'+pad(now.getMonth()+1)+'.'+pad(now.getDate());

function setStatus(message,type=''){
  els.status.textContent=message;
  els.status.className='status'+(type?' '+type:'');
}

function syncCard(){
  els.cardTitle.textContent=els.title.value.trim()||'책 제목';
  els.cardAuthor.textContent=els.author.value.trim()||'저자명';
  els.cardPublisher.textContent=els.publisher.value.trim()||'출판사명';
  const src=els.cover.value.trim();
  if(src && els.cardCover.getAttribute('src')!==src) els.cardCover.src=src;
}

[els.title,els.author,els.publisher,els.cover].forEach(el=>el.addEventListener('input',syncCard));
els.cardCover.addEventListener('error',()=>setStatus('표지 이미지를 불러오지 못했습니다. 표지 URL을 확인해 주세요.','error'));

function cleanText(s=''){
  const t=document.createElement('textarea');
  t.innerHTML=s;
  return (t.value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
}

function cleanAuthor(s=''){
  let t=cleanText(s);
  t=t.replace(/^저자\s*[:：]?\s*/,'').trim();
  const markers=[' 저/',' 저 |',' 저|',' 저,',' 저 ·',' 저'];
  let cut=-1;
  for(const m of markers){
    const i=t.indexOf(m);
    if(i>0 && (cut<0 || i<cut)) cut=i;
  }
  if(cut>0) t=t.slice(0,cut);
  return t.replace(/[|/,]+$/,'').trim();
}

function normalize(s=''){
  return s.toLowerCase().replace(/[\s\-_:·.,'"“”‘’!?()\[\]{}]/g,'');
}

const proxyBuilders=[
  u=>'https://api.allorigins.win/raw?url='+encodeURIComponent(u),
  u=>'https://corsproxy.io/?url='+encodeURIComponent(u)
];

async function fetchText(url){
  let lastError;
  for(const makeUrl of proxyBuilders){
    try{
      const res=await fetch(makeUrl(url),{cache:'no-store'});
      if(!res.ok) throw new Error('HTTP '+res.status);
      const txt=await res.text();
      if(txt && txt.length>500) return txt;
    }catch(err){ lastError=err; }
  }
  throw lastError||new Error('외부 페이지를 불러오지 못했습니다.');
}

function extractGoodsNo(value){
  const v=value.trim();
  const byUrl=v.match(/(?:goods\/|Goods\/)(\d{5,})/);
  if(byUrl) return byUrl[1];
  if(/^\d{5,}$/.test(v)) return v;
  return '';
}

function parseProduct(html,goodsNo){
  const doc=new DOMParser().parseFromString(html,'text/html');

  const by=(...selectors)=>{
    for(const s of selectors){
      const el=doc.querySelector(s);
      const text=el?.getAttribute?.('content')||el?.textContent;
      if(text && cleanText(text)) return cleanText(text);
    }
    return '';
  };

  let title=by('h2.gd_name','h1.gd_name','meta[property="og:title"]','title');
  if(title.includes(' | ')) title=title.split(' | ')[0].trim();
  title=title.replace(/\s*-\s*예스24\s*$/,'').trim();

  let author=by('.gd_auth','.gd_auth a','meta[name="author"]');
  let publisher=by('.gd_pub','.gd_pub a');

  const body=cleanText(doc.body?.innerText||doc.body?.textContent||'');
  if(!author || !publisher){
    const safeTitle=title.replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
    const re=new RegExp(safeTitle+'\\s+(.{1,120}?)\\s*\\|\\s*([^|]{1,80})\\s*\\|');
    const m=body.match(re);
    if(m){
      if(!author) author=m[1];
      if(!publisher) publisher=m[2];
    }
  }

  author=cleanAuthor(author);
  publisher=cleanText(publisher).replace(/^출판사\s*[:：]?\s*/,'').trim();

  return {
    goodsNo:goodsNo,
    title:title||'',
    author:author||'',
    publisher:publisher||'',
    cover:'https://image.yes24.com/goods/'+goodsNo+'/XL'
  };
}

async function lookupByGoodsNo(goodsNo){
  const productUrl='https://www.yes24.com/product/goods/'+goodsNo;
  const html=await fetchText(productUrl);
  return parseProduct(html,goodsNo);
}

async function searchGoodsNo(query){
  const searchUrl='https://www.yes24.com/Product/Search?domain=ALL&query='+encodeURIComponent(query);
  const html=await fetchText(searchUrl);

  const ids=[...html.matchAll(/(?:Product|product)\/(?:Goods|goods)\/(\d{5,})/g)].map(m=>m[1]);
  const unique=[...new Set(ids)].slice(0,5);
  if(!unique.length) throw new Error('YES24 검색 결과에서 상품을 찾지 못했습니다.');

  if(unique.length===1) return unique[0];

  for(const id of unique.slice(0,3)){
    try{
      const data=await lookupByGoodsNo(id);
      if(data.title && (normalize(data.title)===normalize(query) || normalize(data.title).includes(normalize(query)))) return id;
    }catch(e){}
  }
  return unique[0];
}

function applyBook(data){
  if(data.title) els.title.value=data.title;
  if(data.author) els.author.value=data.author;
  if(data.publisher) els.publisher.value=data.publisher;
  if(data.cover) els.cover.value=data.cover;
  if(data.goodsNo) currentGoodsNo=data.goodsNo;
  syncCard();
}

async function doSearch(){
  const query=els.query.value.trim();
  if(!query){
    setStatus('책 제목이나 YES24 상품 URL을 입력해 주세요.','error');
    return;
  }

  els.search.disabled=true;
  els.search.textContent='찾는 중';
  setStatus('YES24에서 도서 정보를 찾고 있습니다.');

  try{
    let goodsNo=extractGoodsNo(query);
    if(!goodsNo) goodsNo=await searchGoodsNo(query);
    const data=await lookupByGoodsNo(goodsNo);
    applyBook(data);
    setStatus('불러왔습니다 · 상품번호 '+goodsNo,'success');
  }catch(err){
    console.error(err);
    setStatus('자동 조회에 실패했습니다. 아래 제목·저자·출판사·표지 URL을 직접 입력하면 카드에는 바로 반영됩니다.','error');
  }finally{
    els.search.disabled=false;
    els.search.textContent='불러오기';
  }
}

els.search.addEventListener('click',doSearch);
els.query.addEventListener('keydown',e=>{ if(e.key==='Enter') doSearch(); });

els.reset.addEventListener('click',()=>{
  currentGoodsNo=DEFAULTS.goodsNo;
  els.query.value='';
  els.title.value=DEFAULTS.title;
  els.author.value=DEFAULTS.author;
  els.publisher.value=DEFAULTS.publisher;
  els.cover.value=DEFAULTS.cover;
  syncCard();
  setStatus('기본값으로 되돌렸습니다.');
});

els.openYes24.addEventListener('click',()=>{
  const q=els.query.value.trim();
  const goodsNo=extractGoodsNo(q)||currentGoodsNo;
  const url=goodsNo
    ? 'https://www.yes24.com/product/goods/'+goodsNo
    : 'https://www.yes24.com/Product/Search?domain=ALL&query='+encodeURIComponent(els.title.value.trim());
  window.open(url,'_blank','noopener,noreferrer');
});

syncCard();
