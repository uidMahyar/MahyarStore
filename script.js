/* ============================================================
   عناصر DOM
   ============================================================ */
var railTabs = document.querySelectorAll('.rail-tab');
var editorPanes = {
  html: document.getElementById('pane-html'),
  css: document.getElementById('pane-css'),
  js: document.getElementById('pane-js'),
  python: document.getElementById('pane-python')
};
var dots = {
  html: document.getElementById('dot-html'),
  css: document.getElementById('dot-css'),
  js: document.getElementById('dot-js'),
  python: document.getElementById('dot-python'),
  status: document.getElementById('dot-status')
};
var statusLabel = document.getElementById('statusLabel');
var placeholder = document.getElementById('placeholder');
var previewFrame = document.getElementById('previewFrame');
var consoleBox = document.getElementById('consoleBox');
var errorList = document.getElementById('errorList');
var openWindowBtn = document.getElementById('openWindowBtn');
var runBtn = document.getElementById('runBtn');
var divider = document.getElementById('divider');

var currentLang = 'html';
var lastGoodWebDoc = null;

/* ============================================================
   تعویض تب‌ها
   ============================================================ */
railTabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    railTabs.forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');

    Object.values(editorPanes).forEach(function (p) { p.classList.remove('active'); });
    currentLang = tab.dataset.lang;
    editorPanes[currentLang].classList.add('active');

    openWindowBtn.disabled = !(currentLang !== 'python' && lastGoodWebDoc);
  });
});

/* ============================================================
   اعتبارسنجی HTML: تعادل تگ‌های باز و بسته
   ============================================================ */
var VOID_ELEMENTS = {
  area: 1, base: 1, br: 1, col: 1, embed: 1, hr: 1, img: 1,
  input: 1, link: 1, meta: 1, param: 1, source: 1, track: 1, wbr: 1
};

function validateHTML(code) {
  var stripped = code.replace(/<!--[\s\S]*?-->/g, '');
  var tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)[^>]*?(\/?)>/g;
  var stack = [];
  var match;

  while ((match = tagRegex.exec(stripped)) !== null) {
    var raw = match[0];
    var tagName = match[1].toLowerCase();
    var selfClosingSlash = match[2];
    var isClosingTag = raw.charAt(1) === '/';

    if (isClosingTag) {
      if (stack.length === 0) {
        return {
          ok: false,
          message: 'تگ بسته «</' + tagName + '>» پیدا شد، ولی هیچ تگ بازی برای بستن وجود نداشت.'
        };
      }
      var top = stack[stack.length - 1];
      if (top !== tagName) {
        return {
          ok: false,
          message: 'تگ «<' + top + '>» هنوز باز بود؛ انتظار «</' + top + '>» می‌رفت ولی «</' + tagName + '>» پیدا شد.'
        };
      }
      stack.pop();
    } else {
      var isVoid = VOID_ELEMENTS[tagName] === 1 || selfClosingSlash === '/';
      if (!isVoid) {
        stack.push(tagName);
      }
    }
  }

  if (stack.length > 0) {
    var unclosed = stack[stack.length - 1];
    return {
      ok: false,
      message: 'تگ «<' + unclosed + '>» باز شده ولی تا آخر کد با «</' + unclosed + '>» بسته نشده.'
    };
  }

  return { ok: true };
}

/* ============================================================
   اعتبارسنجی CSS: تعادل { } ( ) [ ]
   ============================================================ */
function validateCSS(code) {
  var stripped = code.replace(/\/\*[\s\S]*?\*\//g, '');
  stripped = stripped.replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/'(?:[^'\\]|\\.)*'/g, "''");

  var pairs = { '{': '}', '(': ')', '[': ']' };
  var closers = { '}': '{', ')': '(', ']': '[' };
  var stack = [];

  for (var i = 0; i < stripped.length; i++) {
    var ch = stripped.charAt(i);
    if (pairs[ch]) {
      stack.push(ch);
    } else if (closers[ch]) {
      var top = stack.pop();
      if (top !== closers[ch]) {
        return {
          ok: false,
          message: 'کاراکتر «' + ch + '» بدون جفت باز متناظرش پیدا شد؛ احتمالاً یک «' + closers[ch] + '» جا افتاده یا این یکی اضافه‌ست.'
        };
      }
    }
  }

  if (stack.length > 0) {
    var unclosed = stack[stack.length - 1];
    return {
      ok: false,
      message: 'کاراکتر «' + unclosed + '» باز شده ولی تا آخر کد با «' + pairs[unclosed] + '» بسته نشده.'
    };
  }

  return { ok: true };
}

/* ============================================================
   اعتبارسنجی JavaScript: نحو (syntax) از طریق موتور خود مرورگر
   ============================================================ */
function validateJS(code) {
  if (!code.trim()) return { ok: true };
  try {
    new Function(code);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
}

/* ============================================================
   نمایش وضعیت‌های پنل خروجی
   ============================================================ */
function hideAllOutputViews() {
  placeholder.style.display = 'none';
  previewFrame.style.display = 'none';
  consoleBox.style.display = 'none';
  errorList.style.display = 'none';
}

function setDot(name, state) {
  var el = dots[name];
  if (!el) return;
  el.classList.remove('live', 'trip');
  if (state === 'live' || state === 'trip') el.classList.add(state);
}

function setStatusLabel(text, state) {
  statusLabel.childNodes[statusLabel.childNodes.length - 1].textContent = ' ' + text;
  setDot('status', state);
}

function showPlaceholderView() {
  hideAllOutputViews();
  placeholder.style.display = 'flex';
  openWindowBtn.disabled = true;
}

function showPreviewView(docString) {
  hideAllOutputViews();
  previewFrame.style.display = 'block';
  previewFrame.srcdoc = docString;
  lastGoodWebDoc = docString;
  openWindowBtn.disabled = false;
}

function showConsoleView(text) {
  hideAllOutputViews();
  consoleBox.style.display = 'block';
  consoleBox.textContent = text;
}

function showErrorsView(problems) {
  hideAllOutputViews();
  errorList.style.display = 'flex';
  errorList.innerHTML = '';
  problems.forEach(function (p) {
    var card = document.createElement('div');
    card.className = 'error-card';

    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'این بخش خرابه: ' + p.section;
    card.appendChild(tag);

    var msg = document.createElement('p');
    msg.textContent = p.message;
    card.appendChild(msg);

    errorList.appendChild(card);
  });
  openWindowBtn.disabled = true;
}

/* ============================================================
   ساخت سند ترکیبی HTML+CSS+JS برای iframe
   بدون هیچ رشته‌ی تگ اسکریپت لفظی در همین فایل، تا پارسر
   مرورگر گیج نشود.
   ============================================================ */
function buildWebDocString(html, css, js) {
  var openTag = '<' + 'script>';
  var closeTag = '<' + '/script>';

  var parts = [
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>',
    css,
    '</style></head><body>',
    html,
    openTag,
    'window.onerror = function (msg, url, line) {',
    '  parent.postMessage({ type: "runtime-error", msg: msg + " (خط " + line + ")" }, "*");',
    '  return true;',
    '};',
    'try {',
    js,
    '} catch (e) {',
    '  parent.postMessage({ type: "runtime-error", msg: e.message }, "*");',
    '}',
    closeTag,
    '</body></html>'
  ];

  return parts.join('\n');
}

window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'runtime-error') {
    setDot('js', 'trip');
    showErrorsView([{
      section: 'JavaScript (هنگام اجرا)',
      message: e.data.msg
    }]);
  }
});

/* ============================================================
   اجرای HTML/CSS/JS
   ============================================================ */
function runWeb() {
  var html = document.getElementById('editor-html').value;
  var css = document.getElementById('editor-css').value;
  var js = document.getElementById('editor-js').value;

  var htmlResult = validateHTML(html);
  var cssResult = validateCSS(css);
  var jsResult = validateJS(js);

  setDot('html', htmlResult.ok ? 'live' : 'trip');
  setDot('css', cssResult.ok ? 'live' : 'trip');
  setDot('js', jsResult.ok ? 'live' : 'trip');

  var problems = [];
  if (!htmlResult.ok) problems.push({ section: 'HTML', message: htmlResult.message });
  if (!cssResult.ok) problems.push({ section: 'CSS', message: cssResult.message });
  if (!jsResult.ok) problems.push({ section: 'JavaScript', message: jsResult.message });

  if (problems.length > 0) {
    setStatusLabel('قطعی توی مدار پیدا شد', 'trip');
    showErrorsView(problems);
    return;
  }

  setStatusLabel('مدار وصله — همه‌چی درست کار می‌کنه', 'live');
  showPreviewView(buildWebDocString(html, css, js));
}

openWindowBtn.addEventListener('click', function () {
  if (!lastGoodWebDoc) return;
  var w = window.open('', '_blank');
  w.document.open();
  w.document.write(lastGoodWebDoc);
  w.document.close();
});

/* ============================================================
   اجرای Python از طریق Pyodide (بارگذاری تنبل/lazy)
   ============================================================ */
var pyodideInstance = null;
var pyodideLoadPromise = null;

function ensurePyodideScriptTag() {
  return new Promise(function (resolve, reject) {
    if (window.loadPyodide) { resolve(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js';
    s.onload = function () { resolve(); };
    s.onerror = function () {
      reject(new Error('بارگذاری فایل پایتون از سرور ناموفق بود. اتصال اینترنتت رو چک کن.'));
    };
    document.head.appendChild(s);
  });
}

function ensurePyodide() {
  if (pyodideInstance) return Promise.resolve(pyodideInstance);
  if (pyodideLoadPromise) return pyodideLoadPromise;

  setStatusLabel('در حال بارگذاری پایتون (فقط بار اول)...', null);
  showConsoleView('در حال بارگذاری پایتون... چند ثانیه صبر کن.');

  pyodideLoadPromise = ensurePyodideScriptTag()
    .then(function () { return loadPyodide(); })
    .then(function (py) {
      pyodideInstance = py;
      return py;
    })
    .catch(function (err) {
      pyodideLoadPromise = null;
      throw err;
    });

  return pyodideLoadPromise;
}

function runPython() {
  var code = document.getElementById('editor-python').value;

  ensurePyodide().then(function (py) {
    var output = '';
    py.setStdout({ batched: function (s) { output += s + '\n'; } });
    py.setStderr({ batched: function (s) { output += s + '\n'; } });

    return py.runPythonAsync(code).then(function () {
      setDot('python', 'live');
      setStatusLabel('مدار وصله — کد درست اجرا شد', 'live');
      showConsoleView(output || '(کد اجرا شد ولی هیچ چیزی چاپ نکرد)');
    }, function (err) {
      setDot('python', 'trip');
      setStatusLabel('قطعی توی مدار پیدا شد', 'trip');
      showErrorsView([{ section: 'Python', message: err.message }]);
    });
  }).catch(function (err) {
    setDot('python', 'trip');
    setStatusLabel('قطعی توی مدار پیدا شد', 'trip');
    showErrorsView([{ section: 'Python', message: err.message }]);
  });
}

/* ============================================================
   دکمه اجرا
   ============================================================ */
runBtn.addEventListener('click', function () {
  if (currentLang === 'python') {
    runPython();
  } else {
    runWeb();
  }
});

/* ============================================================
   تغییر اندازه با کشیدن خط جداکننده
   ============================================================ */
(function () {
  var outputRegion = document.querySelector('.output-region');
  var workspace = document.querySelector('.workspace');
  var dragging = false;

  divider.addEventListener('mousedown', function () {
    dragging = true;
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mouseup', function () {
    dragging = false;
    document.body.style.userSelect = '';
  });

  window.addEventListener('mousemove', function (e) {
    if (!dragging) return;
    var rect = workspace.getBoundingClientRect();
    var newHeight = rect.bottom - e.clientY;
    var min = 90;
    var max = rect.height - 140;
    newHeight = Math.max(min, Math.min(max, newHeight));
    outputRegion.style.flexBasis = newHeight + 'px';
  });
})();

/* ============================================================
   حالت اولیه: هیچ اجرایی خودکار انجام نمی‌شود
   ============================================================ */
showPlaceholderView();
