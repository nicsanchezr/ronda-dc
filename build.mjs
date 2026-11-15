import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';

// Módulo virtual con todos los temas: cada src/themes/*.theme.js se incluye solo.
const themesPlugin = {
  name: 'themes',
  setup(b) {
    b.onResolve({ filter: /^virtual:themes$/ }, () => ({ path: 'virtual:themes', namespace: 'themes' }));
    b.onLoad({ filter: /.*/, namespace: 'themes' }, () => {
      const dir = path.resolve('src/themes');
      const files = fs.readdirSync(dir).filter((f) => f.endsWith('.theme.js')).sort();
      const contents = files.map((f, i) => `import t${i} from ${JSON.stringify(path.join(dir, f).replace(/\\/g, '/'))};`).join('\n') +
        `\nexport default [${files.map((_, i) => 't' + i).join(', ')}];`;
      return { contents, resolveDir: dir, loader: 'js', watchFiles: files.map((f) => path.join(dir, f)) };
    });
  },
};

// Tipografías incrustadas (sin peticiones a Internet): assets/fonts/Familia-Peso.woff2
function fontFaces() {
  const dir = 'assets/fonts';
  if (!fs.existsSync(dir)) return '';
  return fs.readdirSync(dir).filter((f) => f.endsWith('.woff2')).sort().map((f) => {
    const [fam, weight] = f.replace('.woff2', '').split('-');
    const family = fam.replace(/([a-z])([A-Z])/g, '$1 $2');
    const data = fs.readFileSync(path.join(dir, f)).toString('base64');
    return `@font-face{font-family:"${family}";font-style:normal;font-weight:${weight || 400};font-display:swap;src:url(data:font/woff2;base64,${data}) format("woff2")}`;
  }).join('\n');
}

const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', plugins: [themesPlugin] });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const fonts = fontFaces();
const html = fs.readFileSync('template.html', 'utf8')
  .replace('/*FONTS*/', () => fonts)
  .replace('<script>/*APP*/</script>', () => '<script>' + js + '</script>');
fs.mkdirSync('dist', { recursive: true });
fs.writeFileSync('dist/index.html', html);
// Imagen Open Graph (solo la leen las redes al compartir el enlace; la página no la carga)
if (fs.existsSync('docs/og.png')) fs.copyFileSync('docs/og.png', 'dist/og.png');
console.log('ok', (html.length / 1024).toFixed(0) + ' KB', '(fuentes: ' + (fonts.length / 1024).toFixed(0) + ' KB)');
