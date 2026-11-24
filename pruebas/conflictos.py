import re,os,glob,collections
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')); err=[]
js=[f for f in glob.glob('**/*.js',recursive=True)]
src={f:open(f,encoding='utf-8').read() for f in js}
def exports(t): 
    n=set(re.findall(r'export\s+(?:async\s+)?(?:class|const|function|let)\s+(\w+)',t))
    for m in re.findall(r'export\s*\{([^}]*)\}',t): n|={x.strip().split(' as ')[-1] for x in m.split(',')}
    return n
# 1-2 importaciones: archivo existe y nombres exportados existen
for f,t in src.items():
    for names,path in re.findall(r"import\s*\{([^}]*)\}\s*from\s*'([^']+)'",t)+[(None,p) for p in re.findall(r"import\s+'([^']+)'",t)]:
        tgt=os.path.normpath(os.path.join(os.path.dirname(f),path))
        if not os.path.exists(tgt): err.append(f'IMPORT ROTO {f} -> {path}'); continue
        if names:
            ex=exports(src.get(tgt,''))
            for n in [x.strip().split(' as ')[0] for x in names.split(',') if x.strip()]:
                if n not in ex: err.append(f'NOMBRE NO EXPORTADO {f}: {n} desde {path}')
# 3 vistas del config existen y cada HTML apunta a scripts reales
cfg=open('config/permisos.config.js',encoding='utf-8').read()
for carpeta,bloque in re.findall(r"carpeta: '([\w-]+)'.*?vistas: (\[.*?\])\s*\}",cfg,re.S):
    for arch in re.findall(r"'([\w-]+\.html)'",bloque):
        if not os.path.exists(f'vistas/{carpeta}/{arch}'): err.append(f'VISTA FALTANTE vistas/{carpeta}/{arch}')
html=glob.glob('**/*.html',recursive=True)
for h in html:
    t=open(h,encoding='utf-8').read()
    for p in re.findall(r'(?:src|href)="([^"#?:]+\.(?:js|css|html))"',t)+re.findall(r"from '([^']+\.js)'",t):
        if not os.path.exists(os.path.normpath(os.path.join(os.path.dirname(h),p))): err.append(f'ENLACE ROTO {h} -> {p}')
# vistas huérfanas (existen pero no están en el menú de su rol)
reg={(c,a) for c,b in re.findall(r"carpeta: '([\w-]+)'.*?vistas: (\[.*?\])\s*\}",cfg,re.S) for a in re.findall(r"'([\w-]+\.html)'",b)}
for h in html:
    p=h.split('/')
    if p[0]=='vistas' and p[1]!='publico' and p[2]!='dashboard.html' and (p[1],p[2]) not in reg: err.append(f'VISTA SIN REGISTRAR EN PERMISOS {h}')
# 4 clases duplicadas
cl=collections.defaultdict(list)
for f,t in src.items():
    for n in re.findall(r'export\s+class\s+(\w+)',t): cl[n].append(f)
for n,fs in cl.items():
    if len(fs)>1: err.append(f'CLASE DUPLICADA {n}: {fs}')
# 5 tablas duplicadas
tb=collections.defaultdict(list)
for f,t in src.items():
    for n in re.findall(r"super\('([\w]+)'\)",t): tb[n].append(f)
for n,fs in tb.items():
    if len(fs)>1: err.append(f'TABLA DUPLICADA {n}: {fs}')
# 6 estados de candidato usados vs definidos
defin=set(re.findall(r"(\w+): '[A-Z]",src['src/compartido/dominio/Candidato.js']))
usados=set()
for f,t in src.items():
    if f.endswith('Candidato.js') and 'compartido' in f: continue
    usados|=set(re.findall(r"estadoProceso[:=]+\s*'(\w+)'",t))|set(re.findall(r"estadoProceso: [^'\n]*'(\w+)'",t))
for s in usados-defin: err.append(f'ESTADO NO DEFINIDO {s}')
print('clases:',len(cl),'| tablas:',sorted(tb)); print('estados definidos:',sorted(defin)); print('estados usados:',sorted(usados))
print('\nPROBLEMAS:' if err else '\nSin conflictos detectados.'); [print(' -',e) for e in err]
