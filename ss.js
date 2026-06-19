(function () {
    'use strict';
    var videoId;
    var last_video_id;
    var data;
    var progreess_bar;
    var container;
    var ul;
    var tooltip_text;
    var total_time;
    var lookuptable;
    var bar;
    var seekBar;
    var mouseOnSeekBar;
    var last_mouse_position;
    var timeInSeconds;
    var time;
    var message;
    var clip_message;
    var span;
    var current_time;
    var seconds;
    var panelState = { open: false, search: '', role: 'all' };
    var currentClip = null;

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const timeToPercentage = (time, total_time) => (time / total_time) * 100;
    const timeToRightPercentage = (time, total_time) => 100 - (time / total_time) * 100;

    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const el = document.querySelector(selector);
            if (el) return resolve(el);
            const observer = new MutationObserver(() => {
                const el = document.querySelector(selector);
                if (el) {
                    observer.disconnect();
                    resolve(el);
                }
            });
            observer.observe(document.body, { childList: true, subtree: true });
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Timeout waiting for ${selector}`));
            }, timeout);
        });
    }

    function get_current_seconds() {
        const progressBar = document.querySelector('.ytp-progress-bar');
        if (progressBar) {
            const t = parseInt(progressBar.getAttribute('aria-valuenow'));
            if (!isNaN(t)) return t;
        }
        const video = document.querySelector('video');
        if (video) return Math.floor(video.currentTime);
        return 0;
    }

    function reset_box_data() {
        const header = document.querySelector('.clip_header');
        const footer = document.querySelector('.clip_footer');
        const msg = document.getElementById('clip_box_message');

        if (header) header.style.display = 'none';
        if (footer) footer.style.display = 'none';
        if (msg) {
            msg.innerText = "Monitoring clips...";
            msg.style.opacity = '0.5';
        }

        const shareBtn = document.getElementById('ss_share_btn');
        if (shareBtn) shareBtn.style.display = 'none';
        currentClip = null;

        update_panel_current();
    }

    function update_duration(data) {
        const seconds = get_current_seconds() + 1; // +1 to account for polling delay

        let found = false;
        for (let i = 0; i < data.length; i++) {
            const clip = data[i];
            const t1 = parseInt(clip.clip_time);
            const t2 = parseInt(clip.clip_time) - clip.delay;
            let start_time = Math.min(t1, t2);
            let end_time = Math.max(t1, t2);
            if (start_time === end_time) {
                start_time = t1 - 2;
                end_time = t1 + 2;
            }

            if (seconds >= start_time && seconds <= end_time) {
                found = true;
                const message = clip.message;
                update_box_data(clip);

                const timeDisplay = document.querySelector(".ytp-time-display");
                if (timeDisplay && timeDisplay.innerHTML.includes(message)) return;

                let span = document.getElementById('clip_message');
                if (!span) {
                    span = document.createElement('span');
                    span.id = 'clip_message';
                    const durationParent = document.querySelector(".ytp-time-duration")?.parentElement;
                    if (durationParent) durationParent.append(span);
                }
                span.innerHTML = " • " + message;
                return;
            }
        }

        if (!found) {
            const clip_message = document.getElementById('clip_message');
            if (clip_message) clip_message.remove();
            reset_box_data();
        }
    }

    function handlehover(e) {
        if (!seekBar || !total_time || !lookuptable) return;

        const rect = seekBar.getBoundingClientRect();
        const hoveredX = e.clientX - rect.x;
        const timeInSeconds = hoveredX / rect.width;

        if (last_mouse_position === e.clientX) return;
        last_mouse_position = e.clientX;

        const hoverTime = parseInt(timeInSeconds * total_time);

        for (let i = 0; i < lookuptable.length; i++) {
            if (hoverTime >= lookuptable[i].start_time && hoverTime <= lookuptable[i].end_time) {
                const message = lookuptable[i].message;
                if (tooltip_text) {
                    if (!tooltip_text.innerHTML.includes(message)) {
                        tooltip_text.innerHTML = message;
                    }
                    return;
                }
            }
        }
    }

    function cleanup() {
        console.log("Streamsnip: Cleaning up UI.");
        
        // Remove clip box
        const clip_box = document.getElementById('clip_box_container');
        if (clip_box) clip_box.remove();

        // Remove preview bar markers
        const oldBar = document.getElementById('sspreviewbar');
        if (oldBar) oldBar.remove();

        // Remove duration message
        const clip_message = document.getElementById('clip_message');
        if (clip_message) clip_message.remove();

        // Clear intervals
        if (window.ssDurationInterval) {
            clearInterval(window.ssDurationInterval);
            window.ssDurationInterval = null;
        }
        if (window.ssMarkerInterval) {
            clearInterval(window.ssMarkerInterval);
            window.ssMarkerInterval = null;
        }

        // Remove event listeners
        if (seekBar) {
            seekBar.removeEventListener("mousemove", handlehover);
        }

        // Reset state
        data = null;
        lookuptable = null;
        panelState.open = false;
        panelState.search = '';
        panelState.role = 'all';
        currentClip = null;
    }

    function remove_clip_box() {
        cleanup();
    }

    function create_clip_box() {
        if (document.getElementById('clip_box_container')) return;

        const middle_row = document.getElementById('middle-row');
        if (!middle_row) return;

        const container = document.createElement('div');
        container.id = 'clip_box_container';
        container.innerHTML = `
            <div id="clip_box">
                <img src="https://streamsnip.com/static/logo.svg" id="ss_logo_img" alt="StreamSnip Logo">
                <button id="lt_button" title="Previous Clip">
                    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path></svg>
                </button>
                <div class="clip_content">
                    <div class="clip_header" style="display: none;">
                        <span id="current_clip_id"></span>
                        <span class="clip_author_badge" id="clip_box_author_name"></span>
                    </div>
                    <div class="clip_msg_body" id="clip_box_message" style="opacity: 0.5;">
                        Monitoring clips...
                    </div>
                    <div class="clip_footer" style="display: none;">
                        <span id="clip_box_hms"></span>
                        <span class="dot_sep">•</span>
                        <span id="clip_box_delay"></span>
                    </div>
                </div>
                <button id="gt_button" title="Next Clip">
                    <svg viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" focusable="false"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg>
                </button>
                <button id="ss_share_btn" title="Copy clip link" style="display:none;">
                    <svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </button>
                <button id="ss_toggle_btn" title="Browse all clips" style="display:none;">0 clips ▾</button>
            </div>
            <div id="ss_panel_wrap">
                <div id="ss_panel_inner">
                    <div id="ss_panel">
                        <div id="ss_panel_controls">
                            <input id="ss_search" type="text" placeholder="Search clips..." autocomplete="off" spellcheck="false">
                            <div id="ss_role_filters">
                                <button class="ss_role_btn active" data-role="all">All</button>
                                <button class="ss_role_btn" data-role="moderator">Mod</button>
                                <button class="ss_role_btn" data-role="owner">Owner</button>
                                <button class="ss_role_btn" data-role="member">Member</button>
                            </div>
                        </div>
                        <div id="ss_clip_list"></div>
                    </div>
                </div>
            </div>
        `;
        middle_row.appendChild(container);

        if (!document.getElementById('ss_styles')) {
            document.head.insertAdjacentHTML("beforeend", `
                <style id="ss_styles">
                    #clip_box_container {
                        margin: 12px 0;
                        display: flex;
                        flex-direction: column;
                        width: 100%;
                    }
                    #clip_box {
                        display: flex;
                        align-items: center;
                        gap: 20px;
                        padding: 10px 24px;
                        width: 100%;
                        box-sizing: border-box;
                        border-radius: 10px;
                        font-family: "YouTube Sans", Roboto, Arial, sans-serif;
                        background: rgba(255, 255, 255, 0.04);
                        backdrop-filter: blur(12px);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        color: #fff;
                        position: relative;
                    }
                    #ss_logo_img {
                        height: 24px;
                        width: auto;
                        margin-right: -4px;
                        filter: drop-shadow(0 0 4px rgba(62, 166, 255, 0.4));
                    }
                    #clip_box:hover {
                        background: rgba(255, 255, 255, 0.07);
                        border-color: rgba(255, 255, 255, 0.2);
                        transform: translateY(-1px);
                    }
                    .clip_content {
                        flex: 1;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        gap: 16px;
                        min-width: 0;
                    }
                    .clip_header {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 11px;
                        text-transform: uppercase;
                        letter-spacing: 0.6px;
                        opacity: 0.8;
                        flex-shrink: 0;
                        border-right: 1px solid rgba(255, 255, 255, 0.1);
                        padding-right: 16px;
                    }
                    #current_clip_id {
                        color: #3ea6ff;
                        font-weight: 800;
                    }
                    .clip_author_badge {
                        background: rgba(62, 166, 255, 0.15);
                        color: #3ea6ff;
                        padding: 3px 8px;
                        border-radius: 5px;
                        font-weight: 600;
                    }
                    .clip_msg_body {
                        font-size: 16px;
                        font-weight: 500;
                        color: #fff;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        text-align: center;
                        flex: 1;
                    }
                    .clip_footer {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 13px;
                        opacity: 0.7;
                        flex-shrink: 0;
                        border-left: 1px solid rgba(255, 255, 255, 0.1);
                        padding-left: 16px;
                    }
                    .dot_sep { opacity: 0.5; }
                    #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn) {
                        background: rgba(255, 255, 255, 0.1);
                        color: #fff;
                        border: none;
                        width: 38px;
                        height: 38px;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        flex-shrink: 0;
                    }
                    #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn):hover {
                        background: rgba(255, 255, 255, 0.2);
                        transform: scale(1.05);
                    }
                    #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn):active {
                        transform: scale(0.95);
                    }
                    #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn) svg {
                        width: 24px;
                        height: 24px;
                        fill: currentColor;
                    }
                    
                    /* Light Mode Overrides */
                    html:not([dark]) #clip_box {
                        background: rgba(var(--yt-spec-general-background-a-rgb), 0.05);
                        color: #0f0f0f;
                        border-color: rgba(0, 0, 0, 0.1);
                    }
                    html:not([dark]) .clip_msg_body { color: #0f0f0f; }
                    html:not([dark]) .clip_header, html:not([dark]) .clip_footer { border-color: rgba(0, 0, 0, 0.1); }
                    html:not([dark]) #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn) { background: rgba(0, 0, 0, 0.06); color: #0f0f0f; }
                    html:not([dark]) #clip_box button:not(#ss_toggle_btn):not(#ss_share_btn):hover { background: rgba(0, 0, 0, 0.12); }
                </style>
            `);
        }
    }

    function jump(time) {
        if (time === undefined || time === null) return;
        const video = document.querySelector('video');
        if (video) video.currentTime = parseInt(time);
    }

    function jump_to_clip(clip) {
        const t1 = parseInt(clip.clip_time);
        const t2 = t1 - clip.delay;
        const start_time = Math.min(t1, t2);
        jump(start_time + 1);
        update_box_data(clip);
        requestAnimationFrame(() => { if (data) update_duration(data); });
    }

    function update_box_data(clip) {
        const elements = {
            id: document.getElementById('current_clip_id'),
            name: document.getElementById('clip_box_author_name'),
            msg: document.getElementById('clip_box_message'),
            hms: document.getElementById('clip_box_hms'),
            delay: document.getElementById('clip_box_delay')
        };
        const header = document.querySelector('.clip_header');
        const footer = document.querySelector('.clip_footer');

        if (!elements.id) return;

        if (header) header.style.display = 'flex';
        if (footer) footer.style.display = 'flex';

        elements.id.innerText = clip.id;

        let role = "(Regular)";
        if (clip.author && clip.author.level) {
            let level = clip.author.level.toLowerCase();
            if (level === "owner") role = "(Owner)";
            else if (level === "moderator") role = "(Moderator)";
            else if (level === "member") role = "(Member)";
            else if (level === "automated") role = "(Automated)";
            else if (level === "regular" || level === "everyone") role = "(Regular)";
        }

        elements.name.innerText = `${clip.author.name} ${role}`;

        elements.msg.innerText = `"${clip.message}"`;
        elements.msg.style.opacity = '1';

        elements.hms.innerText = clip.hms;

        if (clip.delay < 0) {
            elements.delay.innerText = `Delay: ${Math.abs(clip.delay)}s`;
        } else {
            elements.delay.innerText = `Ahead: ${clip.delay}s`;
        }

        currentClip = clip;
        const shareBtn = document.getElementById('ss_share_btn');
        if (shareBtn) shareBtn.style.display = 'flex';

        update_panel_current();
    }

    // Move the "current" highlight to the active clip's row without rebuilding
    // the list or scrolling. Rebuilding/scrolling on every 1s update made the
    // panel snap to the current clip, so the user could never scroll up to browse.
    function update_panel_current() {
        if (!panelState.open) return;
        const list = document.getElementById('ss_clip_list');
        if (!list) return;
        const id = currentClip ? String(currentClip.id) : null;
        const prev = list.querySelector('.ss_row.current');
        if (prev && prev.dataset.id !== id) prev.classList.remove('current');
        if (id) {
            const next = list.querySelector(`.ss_row[data-id="${CSS.escape(id)}"]`);
            if (next) next.classList.add('current');
        }
    }

    function refresh_markers() {
        const progressBar = document.querySelector('.ytp-progress-bar');
        if (!progressBar || !lookuptable || !ul) return;

        const newTotalTime = parseInt(progressBar.getAttribute('aria-valuemax'));
        if (isNaN(newTotalTime) || newTotalTime <= 0 || newTotalTime === total_time) return;

        total_time = newTotalTime;
        const bars = ul.querySelectorAll('li.sspreviewbar');
        bars.forEach((bar, i) => {
            if (!lookuptable[i]) return;
            bar.style.left = `${timeToPercentage(lookuptable[i].start_time, total_time)}%`;
            bar.style.right = `${timeToRightPercentage(lookuptable[i].end_time, total_time)}%`;
        });
    }

    function esc(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function share_clip(clip) {
        if (!clip || !last_video_id) return false;
        const time = parseInt(clip.clip_time);
        const url = `https://youtu.be/${last_video_id}?t=${time}`;
        try {
            await navigator.clipboard.writeText(`"${clip.message}" - ${url}`);
            return true;
        } catch (e) {
            return false;
        }
    }

    function render_panel() {
        const list = document.getElementById('ss_clip_list');
        if (!list || !data) return;

        const query = panelState.search.toLowerCase().trim();
        const role = panelState.role;

        const filtered = data.filter(clip => {
            if (query) {
                const inMsg = clip.message.toLowerCase().includes(query);
                const inAuthor = clip.author && clip.author.name && clip.author.name.toLowerCase().includes(query);
                if (!inMsg && !inAuthor) return false;
            }
            if (role !== 'all') {
                const level = (clip.author && clip.author.level || 'regular').toLowerCase();
                if (role !== level) return false;
            }
            return true;
        });

        if (!filtered.length) {
            list.innerHTML = '<div id="ss_no_results">No clips match</div>';
            return;
        }

        const linkSVG = '<svg viewBox="0 0 24 24"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

        list.innerHTML = filtered.map(clip => {
            const level = (clip.author && clip.author.level || 'regular').toLowerCase();
            const roleLabel = level === 'moderator' ? 'Mod' : level === 'owner' ? 'Owner' : level === 'member' ? 'Mbr' : level === 'automated' ? 'Bot' : 'Reg';
            const isCurrent = currentClip && String(clip.id) === String(currentClip.id);
            return `<div class="ss_row${isCurrent ? ' current' : ''}" data-id="${esc(clip.id)}">` +
                `<span class="ss_row_id">#${esc(clip.id)}</span>` +
                `<span class="ss_row_time">${esc(clip.hms)}</span>` +
                `<span class="ss_row_msg">&ldquo;${esc(clip.message)}&rdquo;</span>` +
                `<span class="ss_row_role">${esc(roleLabel)}</span>` +
                `<button class="ss_row_share" title="Copy link">${linkSVG}</button>` +
            `</div>`;
        }).join('');

        Array.from(list.children).forEach((row, i) => {
            const clip = filtered[i];
            if (!clip) return;
            row.addEventListener('click', () => {
                jump_to_clip(clip);
            });
            const shareBtn = row.querySelector('.ss_row_share');
            if (shareBtn) {
                shareBtn.addEventListener('click', async e => {
                    e.stopPropagation();
                    const ok = await share_clip(clip);
                    if (ok) {
                        shareBtn.classList.add('ss-copied');
                        setTimeout(() => shareBtn.classList.remove('ss-copied'), 1400);
                    }
                });
            }
        });
    }

    function toggle_panel() {
        const wrap = document.getElementById('ss_panel_wrap');
        const container = document.getElementById('clip_box_container');
        const btn = document.getElementById('ss_toggle_btn');
        if (!wrap) return;

        panelState.open = !panelState.open;
        wrap.classList.toggle('open', panelState.open);
        if (container) container.classList.toggle('ss-open', panelState.open);
        if (btn) btn.textContent = `${data ? data.length : 0} clips ${panelState.open ? '▴' : '▾'}`;

        if (panelState.open) {
            render_panel();
            requestAnimationFrame(() => {
                const cur = document.querySelector('.ss_row.current');
                if (cur) cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            });
        }
    }

    function setup_panel_listeners() {
        const search = document.getElementById('ss_search');
        if (search) {
            search.addEventListener('input', e => {
                panelState.search = e.target.value;
                render_panel();
            });
        }

        document.querySelectorAll('.ss_role_btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.ss_role_btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                panelState.role = btn.dataset.role;
                render_panel();
            });
        });

        const toggleBtn = document.getElementById('ss_toggle_btn');
        if (toggleBtn) toggleBtn.addEventListener('click', toggle_panel);

        const shareBtn = document.getElementById('ss_share_btn');
        if (shareBtn) {
            shareBtn.addEventListener('click', async () => {
                if (!currentClip) return;
                const ok = await share_clip(currentClip);
                if (ok) {
                    shareBtn.classList.add('ss-copied');
                    setTimeout(() => shareBtn.classList.remove('ss-copied'), 1400);
                }
            });
        }
    }

    function get_to_clip(reverse = false) {
        if (!lookuptable || !lookuptable.length) return;
        const seconds = get_current_seconds();
        let targetClip = null;

        for (let i = 0; i < lookuptable.length; i++) {
            const clip = lookuptable[i];
            if (reverse) {
                if (clip.end_time < seconds) {
                    if (!targetClip || clip.end_time > targetClip.end_time) targetClip = clip;
                }
            } else {
                if (clip.start_time > seconds) {
                    if (!targetClip || clip.start_time < targetClip.start_time) targetClip = clip;
                }
            }
        }

        if (!targetClip) {
            targetClip = reverse ? lookuptable[lookuptable.length - 1] : lookuptable[0];
        }

        const fullClipData = data.find(c => c.id === targetClip.id);
        if (fullClipData) {
            jump_to_clip(fullClipData);
        }
    }

    function parseVideoId(url) {
        try {
            const urlObj = new URL(url);
            if (urlObj.hostname.includes('youtube.com')) {
                // Ensure we are on a watch page and 'v' exists
                if (urlObj.pathname === '/watch') {
                    const v = urlObj.searchParams.get('v');
                    return (v && v.trim()) ? v : null;
                }
                // Handle embed
                if (urlObj.pathname.startsWith('/embed/')) {
                    const parts = urlObj.pathname.split('/');
                    return (parts[2] && parts[2].trim()) ? parts[2] : null;
                }
            } else if (urlObj.hostname === 'youtu.be') {
                const v = urlObj.pathname.substring(1);
                return (v && v.trim()) ? v : null;
            }
        } catch (e) {
            // fallback
        }
        return null;
    }

    async function run() {
        const currentVideoId = parseVideoId(window.location.href);

        // Ensure no requests are made if not on a video page
        if (!currentVideoId) {
            if (last_video_id !== null) {
                console.log("Streamsnip: Left video page, cleaning up.");
                cleanup();
                last_video_id = null;
            }
            return;
        }

        // Prevent redundant fetches for the same video
        if (currentVideoId === last_video_id) return;

        // New video detected, remove old state first
        cleanup();
        last_video_id = currentVideoId;

        console.log('Streamsnip Active for:', currentVideoId);

        try {
            const qurl = `https://streamsnip.com/extension/clips/${currentVideoId}`;
            const response = await fetch(qurl);
            const rawData = await response.json();

            if (!rawData || !rawData.length) {
                console.log("Streamsnip: No clips found.");
                return;
            }

            // Deduplicate and merge
            const merged = [];
            rawData.forEach(clip => {
                const existing = merged.find(c => c.id === clip.id);
                if (existing) {
                    existing.author.name += `, ${clip.author.name}`;
                    existing.message += ` & ${clip.message}`;
                } else {
                    merged.push(JSON.parse(JSON.stringify(clip)));
                }
            });
            data = merged;

            // Wait for critical elements to appear in the DOM
            await waitForElement('.ytp-progress-bar');
            await waitForElement('#middle-row');

            create_clip_box();
            setup_panel_listeners();

            const toggleBtn = document.getElementById('ss_toggle_btn');
            if (toggleBtn) {
                toggleBtn.style.display = 'flex';
                toggleBtn.textContent = `${data.length} clips ▾`;
            }

            // Clear any existing intervals for duration tracking
            if (window.ssDurationInterval) clearInterval(window.ssDurationInterval);
            window.ssDurationInterval = setInterval(() => update_duration(data), 1000);

            const progressBar = document.querySelector('.ytp-progress-bar');
            const progressContainer = document.querySelector('.ytp-progress-bar-container');

            // Cleanup old bar
            const oldBar = document.getElementById('sspreviewbar');
            if (oldBar) oldBar.remove();

            ul = document.createElement('ul');
            ul.id = 'sspreviewbar';

            total_time = parseInt(progressBar.getAttribute('aria-valuemax'));
            lookuptable = [];

            data.forEach(clip => {
                const t1 = parseInt(clip.clip_time);
                const t2 = t1 - clip.delay;
                const start = Math.min(t1, t2);
                const end = Math.max(t1, t2);

                const bar = document.createElement('li');
                bar.className = 'sspreviewbar';
                bar.style.position = "absolute";
                bar.style.left = `${timeToPercentage(start, total_time)}%`;
                bar.style.right = `${timeToRightPercentage(end, total_time)}%`;
                ul.appendChild(bar);

                lookuptable.push({
                    start_time: start,
                    end_time: end,
                    message: clip.message,
                    id: clip.id
                });
            });

            progressContainer.appendChild(ul);

            if (window.ssMarkerInterval) clearInterval(window.ssMarkerInterval);
            window.ssMarkerInterval = setInterval(refresh_markers, 5 * 60 * 1000);

            tooltip_text = document.querySelector(".ytp-tooltip-progress-bar-pill-title");
            seekBar = progressContainer;

            // Remove old listeners before adding new one
            seekBar.removeEventListener("mousemove", handlehover);
            seekBar.addEventListener("mousemove", handlehover);

            document.getElementById('lt_button').onclick = () => get_to_clip(true);
            document.getElementById('gt_button').onclick = () => get_to_clip(false);

        } catch (err) {
            console.error('Streamsnip failed to initialize:', err);
        }
    }

    // YouTube SPA navigation detection
    window.addEventListener('yt-navigate-finish', () => {
        console.log('Streamsnip: Navigation finished.');
        run();
    });

    // Fallback polling for unusual transitions
    let lastUrl = location.href;
    setInterval(() => {
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            run();
        }
    }, 1000);

    // Initial load
    run();
})();
