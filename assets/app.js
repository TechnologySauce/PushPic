/* PushPic - GitHub Pages image host. All config stays in browser localStorage. */
(function () {
  'use strict';

  var STORAGE_KEY = 'pushpic.config.v1';
  var MAX_FILES = 20;
  var MAX_SIZE = 10 * 1024 * 1024;
  var IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|bmp|avif|ico)$/i;

  var cfg = loadConfig();
  var state = { files: [], page: 1, pageSize: 24, query: '' };
  var el = {};

  function $(id) { return document.getElementById(id); }

  function loadConfig() {
    try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')); }
    catch (e) { return defaults(); }
  }
  function defaults() {
    return { repo: 'TechnologySauce/PushPic', branch: 'main', dir: 'images', token: '', customDomain: false, domain: '' };
  }
  function saveConfig(next) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    cfg = next;
    updateBadge();
  }
  function configured() { return !!(cfg.repo && cfg.token); }

  function updateBadge() {
    var badge = el.configBadge;
    badge.textContent = configured() ? '已配置' : '未配置';
    badge.className = 'badge ' + (configured() ? 'badge-ok' : 'badge-warn');
  }

  function apiHeaders() {
    return {
      'Authorization': 'token ' + cfg.token,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }

  function encodePath(path) { return path.split('/').map(encodeURIComponent).join('/'); }

  function rawUrl(path, sha) {
    return 'https://raw.githubusercontent.com/' + cfg.repo + '/' + cfg.branch + '/' + encodePath(path);
  }

  function pagesBase() {
    var parts = cfg.repo.split('/');
    return 'https://' + parts[0].toLowerCase() + '.github.io/' + parts[1] + '/';
  }

  function displayUrl(path) {
    if (cfg.customDomain && cfg.domain) {
      var host = 'https://' + cfg.domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
      return host + '/' + encodePath(path);
    }
    return pagesBase() + encodePath(path);
  }

  function setStatus(msg, kind) {
    el.status.textContent = msg || '';
    el.status.className = 'status' + (kind ? ' ' + kind : '');
  }

  function apiFetch(url, options) {
    return fetch(url, Object.assign({ headers: apiHeaders() }, options || {})).then(function (res) {
      if (res.ok) return res.json();
      return res.json().catch(function () { return {}; }).then(function (body) {
        var err = new Error(body.message || ('GitHub API ' + res.status));
        err.status = res.status;
        throw err;
      });
    });
  }

  function listImages() {
    var url = 'https://api.github.com/repos/' + cfg.repo + '/contents/' + encodePath(cfg.dir) + '?ref=' + encodeURIComponent(cfg.branch);
    return apiFetch(url).then(function (data) {
      if (!Array.isArray(data)) return [];
      return data.filter(function (item) {
        return item.type === 'file' && IMAGE_EXT.test(item.name);
      }).map(function (item) {
        return { name: item.name, path: item.path, sha: item.sha, size: item.size, raw: item.download_url || rawUrl(item.path, item.sha) };
      }).sort(function (a, b) { return a.name.localeCompare(b.name); });
    }).catch(function (err) {
      if (err.status === 404) return [];
      throw err;
    });
  }

  function uniqueName(name) {
    var dot = name.lastIndexOf('.');
    var base = dot > 0 ? name.slice(0, dot) : name;
    var ext = dot > 0 ? name.slice(dot) : '';
    var exists = function (n) { return state.files.some(function (f) { return f.name.toLowerCase() === n.toLowerCase(); }); };
    if (!exists(name)) return name;
    var i = 2;
    while (exists(base + '-' + i + ext)) i++;
    return base + '-' + i + ext;
  }

  function readFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1] || ''); };
      reader.onerror = function () { reject(new Error('读取文件失败: ' + file.name)); };
      reader.readAsDataURL(file);
    });
  }

  function uploadFile(file, name) {
    var path = cfg.dir.replace(/^\/+|\/+$/g, '') + '/' + name;
    var url = 'https://api.github.com/repos/' + cfg.repo + '/contents/' + encodePath(path);
    return readFile(file).then(function (content) {
      return apiFetch(url, {
        method: 'PUT',
        headers: Object.assign(apiHeaders(), { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ message: 'Upload ' + name + ' via PushPic', content: content, branch: cfg.branch })
      });
    }).then(function (res) {
      return { name: name, path: res.content.path, sha: res.content.sha, size: file.size, raw: res.content.download_url || rawUrl(res.content.path, res.content.sha) };
    });
  }

  function renderGallery() {
    var q = state.query.trim().toLowerCase();
    var files = state.files.filter(function (f) { return !q || f.name.toLowerCase().indexOf(q) !== -1; });
    var totalPages = Math.max(1, Math.ceil(files.length / state.pageSize));
    state.page = Math.min(state.page, totalPages);
    var start = (state.page - 1) * state.pageSize;
    var pageFiles = files.slice(start, start + state.pageSize);
    el.gallery.innerHTML = '';
    if (!pageFiles.length) {
      var p = document.createElement('p');
      p.className = 'empty';
      p.textContent = state.files.length ? '没有匹配的文件。' : '仓库中还没有图片，上传一张试试吧。';
      el.gallery.appendChild(p);
    }
    pageFiles.forEach(function (file) {
      var url = displayUrl(file.path);
      var tile = document.createElement('div');
      tile.className = 'tile';
      var img = document.createElement('img');
      img.className = 'tile-thumb';
      img.src = file.raw;
      img.alt = file.name;
      img.loading = 'lazy';
      img.addEventListener('click', function () { openPreview(file); });
      var meta = document.createElement('div');
      meta.className = 'tile-meta';
      var name = document.createElement('span');
      name.className = 'tile-name';
      name.textContent = file.name;
      name.title = file.name;
      var sub = document.createElement('div');
      sub.className = 'tile-sub';
      sub.textContent = formatSize(file.size);
      meta.appendChild(name); meta.appendChild(sub);
      var actions = document.createElement('div');
      actions.className = 'tile-actions';
      var copy = document.createElement('button');
      copy.className = 'btn btn-primary'; copy.type = 'button'; copy.textContent = '复制链接';
      copy.addEventListener('click', function () { copyText(url, copy); });
      var del = document.createElement('button');
      del.className = 'btn btn-ghost'; del.type = 'button'; del.textContent = '删除';
      del.addEventListener('click', function () { deleteFile(file, del); });
      actions.appendChild(copy); actions.appendChild(del);
      tile.appendChild(img); tile.appendChild(meta); tile.appendChild(actions);
      el.gallery.appendChild(tile);
    });
    el.pagination.hidden = files.length <= state.pageSize;
    el.pageInfo.textContent = state.page + ' / ' + totalPages;
    el.prevBtn.disabled = state.page <= 1;
    el.nextBtn.disabled = state.page >= totalPages;
  }

  function formatSize(bytes) {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  function copyText(text, btn) {
    var done = function () {
      var old = btn.textContent;
      btn.textContent = '已复制';
      setTimeout(function () { btn.textContent = old; }, 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallbackCopy(text, done); });
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { setStatus('复制失败，请手动复制。', 'err'); }
    document.body.removeChild(ta);
  }

  function openPreview(file) {
    el.previewName.textContent = file.name;
    el.previewImg.src = file.raw;
    var url = displayUrl(file.path);
    var raw = rawUrl(file.path, file.sha);
    el.previewLinks.innerHTML = '';
    [['图片链接（Pages）', url], ['原始文件链接（raw）', raw], ['Markdown', '![' + file.name + '](' + url + ')']].forEach(function (pair) {
      var label = document.createElement('div');
      label.className = 'link-label'; label.textContent = pair[0];
      var row = document.createElement('div'); row.className = 'link-row';
      var input = document.createElement('input'); input.className = 'input'; input.readOnly = true; input.value = pair[1];
      var btn = document.createElement('button'); btn.className = 'btn btn-primary'; btn.type = 'button'; btn.textContent = '复制';
      btn.addEventListener('click', function () { copyText(pair[1], btn); });
      row.appendChild(input); row.appendChild(btn);
      el.previewLinks.appendChild(label); el.previewLinks.appendChild(row);
    });
    el.previewModal.hidden = false;
  }

  function deleteFile(file, btn) {
    if (!window.confirm('确定删除 ' + file.name + '？')) return;
    btn.disabled = true;
    var url = 'https://api.github.com/repos/' + cfg.repo + '/contents/' + encodePath(file.path);
    apiFetch(url, {
      method: 'DELETE',
      headers: Object.assign(apiHeaders(), { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ message: 'Delete ' + file.name + ' via PushPic', sha: file.sha, branch: cfg.branch })
    }).then(function () {
      return refresh();
    }).then(function () {
      setStatus('已删除 ' + file.name, 'ok');
    }).catch(function (err) {
      btn.disabled = false;
      setStatus('删除失败：' + err.message, 'err');
    });
  }

  function refresh() {
    if (!configured()) {
      state.files = [];
      renderGallery();
      return Promise.resolve();
    }
    return listImages().then(function (files) {
      state.files = files;
      renderGallery();
    }).catch(function (err) {
      setStatus('加载图片失败：' + err.message, 'err');
    });
  }

  function uploadFiles(files) {
    if (!configured()) {
      setStatus('请先在「设置」中填写 Token。', 'err');
      el.settingsModal.hidden = false;
      return;
    }
    var list = Array.prototype.slice.call(files).filter(function (f) { return f.type.indexOf('image/') === 0; });
    if (!list.length) { setStatus('未选择图片文件。', 'err'); return; }
    if (list.length > MAX_FILES) list = list.slice(0, MAX_FILES);
    var oversized = list.filter(function (f) { return f.size > MAX_SIZE; });
    if (oversized.length) {
      setStatus('以下文件超过 10 MB，已跳过：' + oversized.map(function (f) { return f.name; }).join('、'), 'err');
      list = list.filter(function (f) { return f.size <= MAX_SIZE; });
    }
    if (!list.length) return;
    el.progressWrap.hidden = false;
    var done = 0;
    setStatus('正在上传 0/' + list.length + ' …');
    var chain = Promise.resolve();
    list.forEach(function (file) {
      chain = chain.then(function () {
        var name = uniqueName(file.name);
        return uploadFile(file, name).then(function (item) {
          state.files.push(item);
          done++;
          el.progressBar.style.width = (done / list.length * 100) + '%';
          el.progressText.textContent = done + ' / ' + list.length;
          setStatus('正在上传 ' + done + '/' + list.length + ' …');
        });
      });
    });
    chain.then(function () {
      setStatus('上传完成，共 ' + done + ' 张。', 'ok');
      renderGallery();
      return refresh();
    }).catch(function (err) {
      setStatus('上传失败：' + err.message, 'err');
    });
  }

  function openSettings() {
    var form = el.settingsForm.elements;
    form.repo.value = cfg.repo;
    form.branch.value = cfg.branch;
    form.dir.value = cfg.dir;
    form.token.value = cfg.token;
    form.customDomain.checked = !!cfg.customDomain;
    form.domain.value = cfg.domain;
    el.tokenHint.textContent = cfg.token
      ? '已保存 Token（' + cfg.token.slice(0, 4) + '…' + cfg.token.slice(-4) + '）。留空则保留原 Token；需要 repo 权限。'
      : '仅保存在本浏览器 localStorage，不会上传到任何服务器。需要 repo 权限。';
    el.settingsError.hidden = true;
    el.settingsModal.hidden = false;
  }

  function init() {
    ['configBadge', 'settingsBtn', 'dropzone', 'fileInput', 'progressWrap', 'progressBar', 'progressText',
     'status', 'gallery', 'searchInput', 'refreshBtn', 'pagination', 'prevBtn', 'nextBtn', 'pageInfo',
     'settingsModal', 'settingsForm', 'settingsError', 'tokenHint', 'previewModal', 'previewName',
     'previewImg', 'previewLinks'].forEach(function (id) { el[id] = $(id); });

    updateBadge();
    el.settingsBtn.addEventListener('click', openSettings);
    document.querySelectorAll('[data-close]').forEach(function (node) {
      node.addEventListener('click', function () { el.settingsModal.hidden = true; });
    });
    document.querySelectorAll('[data-close-preview]').forEach(function (node) {
      node.addEventListener('click', function () { el.previewModal.hidden = true; });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { el.settingsModal.hidden = true; el.previewModal.hidden = true; }
    });

    el.settingsForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = el.settingsForm.elements;
      var repo = f.repo.value.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
      if (!/^[^/\s]+\/[^/\s]+$/.test(repo)) {
        el.settingsError.textContent = '仓库格式应为 owner/repo'; el.settingsError.hidden = false; return;
      }
      var next = {
        repo: repo,
        branch: f.branch.value.trim() || 'main',
        dir: f.dir.value.trim().replace(/^\/+|\/+$/g, '') || 'images',
        token: f.token.value.trim() || cfg.token,
        customDomain: f.customDomain.checked,
        domain: f.domain.value.trim()
      };
      saveConfig(next);
      el.settingsModal.hidden = true;
      el.progressBar.style.width = '0';
      setStatus('配置已保存。');
      refresh();
    });

    el.dropzone.addEventListener('click', function () { el.fileInput.click(); });
    el.dropzone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.fileInput.click(); }
    });
    el.fileInput.addEventListener('change', function () {
      uploadFiles(el.fileInput.files);
      el.fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach(function (evt) {
      el.dropzone.addEventListener(evt, function (e) { e.preventDefault(); el.dropzone.classList.add('dragover'); });
    });
    ['dragleave', 'drop'].forEach(function (evt) {
      el.dropzone.addEventListener(evt, function (e) { e.preventDefault(); el.dropzone.classList.remove('dragover'); });
    });
    el.dropzone.addEventListener('drop', function (e) { uploadFiles(e.dataTransfer.files); });

    el.refreshBtn.addEventListener('click', function () { refresh().then(function () { setStatus('已刷新。', 'ok'); }); });
    el.searchInput.addEventListener('input', function () { state.query = el.searchInput.value; state.page = 1; renderGallery(); });
    el.prevBtn.addEventListener('click', function () { state.page--; renderGallery(); });
    el.nextBtn.addEventListener('click', function () { state.page++; renderGallery(); });

    refresh();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
