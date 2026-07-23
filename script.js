// ---------- Tab switching ----------
const tabs = document.querySelectorAll('.tab');
const panes = {
  html: document.getElementById('pane-html'),
  css: document.getElementById('pane-css'),
  js: document.getElementById('pane-js'),
  python: document.getElementById('pane-python'),
};
const outputSection = document.getElementById('outputSection');
const outputLabel = document.getElementById('outputLabel');
const previewFrame = document.getElementById('previewFrame');
const pyOutput = document.getElementById('pyOutput');
const openWindowBtn = document.getElementById('openWindowBtn');

let currentLang = 'html';

tabs.forEach(function (tab) {
  tab.addEventListener('click', function () {
    tabs.forEach(function (t) { t.classList.remove('active'); });
    tab.classList.add('active');

    Object.values(panes).forEach(function (p) { p.classList.remove('active'); });
    currentLang = tab.dataset.lang;
    panes[currentLang].classList.add('active');

    if (currentLang === 'python') {
      outputLabel.textContent = 'خروجی کنسول پایتون';
      previewFrame.style.display = 'none';
      pyOutput.style.display = 'block';
      openWindowBtn.style.display = 'none';
    } else {
      outputLabel.textContent = 'پیش‌نمایش زنده';
      previewFrame.style.display = 'block';
      pyOutput.style.display = 'none';
      openWindowBtn.style.display = 'inline-block';
    }
  });
});

// ---------- Build HTML/CSS/JS document safely ----------
// We build the document with DOM APIs instead of a giant template string,
// so a literal "<script>" tag can never accidentally break this file's own parsing.
function buildWebDocString() {
  var html = document.getElementById('editor-html').value;
  var css = document.getElementById('editor-css').value;
  var js = document.getElementById('editor-js').value;

  var parts = [];
  parts.push('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>');
  parts.push(css);
  parts.push('</style></head><body>');
  parts.push(html);
  parts.push('<' + 'script>');
  parts.push('window.onerror = function(msg, url, line) { parent.postMessage({type:"jserror", msg: msg + " (line " + line + ")"}, "*"); };');
  parts.push('try {');
  parts.push(js);
  parts.push('} catch (e) { parent.postMessage({type:"jserror", msg: e.message}, "*"); }');
  parts.push('<' + '/script>');
  parts.push('</body></html>');

  return parts.join('\n');
}

function runWeb() {
  previewFrame.srcdoc = buildWebDocString();
}

window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'jserror') {
    console.warn('خطای جاوااسکریپت در پیش‌نمایش:', e.data.msg);
  }
});

openWindowBtn.addEventListener('click', function () {
  var w = window.open('', '_blank');
  w.document.open();
  w.document.write(buildWebDocString());
  w.document.close();
});

// ---------- Python execution via Pyodide ----------
var pyodideInstance = null;
var pyodideLoading = false;

function ensurePyodide() {
  if (pyodideInstance) {
    return Promise.resolve(pyodideInstance);
  }
  if (pyodideLoading) {
    return Promise.resolve(null);
  }
  pyodideLoading = true;
  pyOutput.innerHTML = '<span class="info">در حال بارگذاری پایتون (فقط بار اول، چند ثانیه طول می‌کشد)...</span>';

  return loadPyodide().then(function (py) {
    pyodideInstance = py;
    pyodideLoading = false;
    return py;
  }).catch(function (err) {
    pyodideLoading = false;
    pyOutput.innerHTML = '<span class="err">خطا در بارگذاری پایتون: ' + err.message + '</span>';
    return null;
  });
}

function runPython() {
  var code = document.getElementById('editor-python').value;

  ensurePyodide().then(function (py) {
    if (!py) return;

    pyOutput.textContent = '';
    var outputBuffer = '';

    py.setStdout({ batched: function (s) { outputBuffer += s + '\n'; } });
    py.setStderr({ batched: function (s) { outputBuffer += s + '\n'; } });

    py.runPythonAsync(code).then(function () {
      pyOutput.textContent = outputBuffer || '(بدون خروجی — کد اجرا شد ولی چیزی چاپ نشد)';
    }).catch(function (err) {
      pyOutput.textContent = outputBuffer;
      var errSpan = document.createElement('span');
      errSpan.className = 'err';
      errSpan.textContent = '\n' + err.message;
      pyOutput.appendChild(errSpan);
    });
  });
}

// ---------- Run button ----------
document.getElementById('runBtn').addEventListener('click', function () {
  if (currentLang === 'python') {
    runPython();
  } else {
    runWeb();
  }
});

// ---------- Divider drag-resize ----------
(function () {
  var divider = document.getElementById('divider');
  var section = document.getElementById('outputSection');
  var app = document.querySelector('.app');
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
    var rect = app.getBoundingClientRect();
    var newHeight = rect.bottom - e.clientY;
    var min = 80;
    var max = rect.height - 150;
    newHeight = Math.max(min, Math.min(max, newHeight));
    section.style.flexBasis = newHeight + 'px';
  });
})();

// ---------- Run once on load ----------
window.addEventListener('load', function () {
  runWeb();
});
