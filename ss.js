(function() {
    'use strict';
    var videoId;
    var last_video_id;
    var url;
    var qurl;
    var response;
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
    var preview;
    var preview_bar;
    var clip;
    var start_time;
    var end_time;
    var i;
    var clip_message;
    var span;
    var current_time;
    var seconds;


    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    function onUrlChange() {
        console.log('Detected URL change');
        run(); // your main function
    }

    history.pushState = function (...args) {
        originalPushState.apply(history, args);
        onUrlChange();
    };

    history.replaceState = function (...args) {
        originalReplaceState.apply(history, args);
        onUrlChange();
    };

    window.addEventListener('popstate', () => {
        onUrlChange();
    });

    const delay = (delayInms) => {
        return new Promise(resolve => setTimeout(resolve, delayInms));
    };
    const timeToPercentage = (time, total_time) => {
        return (time / total_time) * 100;
    }
    const timeToRightPercentage = (time, total_time) => {
        return 100 - (time / total_time) * 100;
    }

    function update_duration(data){
        current_time = document.getElementsByClassName("ytp-time-current")[0].textContent;  
        current_time = current_time.split(':');
        seconds = 0;
        if(current_time.length == 2){
            seconds = parseInt(current_time[0]) * 60 + parseInt(current_time[1]);
        }
        else if(current_time.length == 3){
            seconds = parseInt(current_time[0]) * 3600 + parseInt(current_time[1]) * 60 + parseInt(current_time[2]);
        }
        for(let i=0; i<data.length; i++){
            var clip = data[i];
            var start_time = clip.clip_time
            var end_time = clip.clip_time - clip.delay;
            if(start_time < end_time){
                start_time, end_time = end_time, start_time;
            }
            if(seconds >= start_time && seconds <= end_time){
                var message = clip.message;
                if (document.getElementsByClassName("ytp-time-display")[0].innerHTML.includes(message)){
                    console.log('Message already added');
                    return; // already added
                }
                span = document.getElementById('clip_message');
                if(!span){
                    span = document.createElement('span');
                }
                span.id = 'clip_message';
                span.innerHTML = " •  " +message;
                document.getElementsByClassName("ytp-time-duration")[0].parentElement.append(span);
                update_box_data(clip);
                return; // there can be only one message at a time1
            }
            
        }
        clip_message = document.getElementById('clip_message');
        if(clip_message){
            clip_message.remove();
        }
    }
    
    function handlehower(e){
        timeInSeconds = ((e.clientX - seekBar.getBoundingClientRect().x) / seekBar.clientWidth);
        if(last_mouse_position == e.clientX){
            return;
        }
        last_mouse_position = e.clientX;
        // timeInSeconds is a value between 0 and 1 then get the time 
        time = timeInSeconds * total_time;
        time = parseInt(time);
        for(let i=0; i<lookuptable.length; i++){
            if(time >= lookuptable[i].start_time && time <= lookuptable[i].end_time){
                message = lookuptable[i].message;
                /*
                var preview = document.querySelector('.preview');
                if(preview){
                    preview.remove();
                }
                preview = document.createElement('div');
                preview.classList.add('preview');
                preview.innerHTML = message;
                preview.style.position = "absolute";
                preview.style.top = '0';
                preview.style.left = e.clientX + 'px';
                preview.style.backgroundColor = 'black';
                preview.style.color = 'white';
                preview.style.padding = '5px';
                preview.style.borderRadius = '5px';
                preview.style.zIndex = '1000';
                preview.style.transform = 'translate(-50%, -100%)';
                preview.style.pointerEvents = 'none';
                seekBar.appendChild(preview);
                */
                tooltip_text.textContent += '\n' + message;
            }
        }
    }
    function remove_clip_box(){
        var clip_box = document.getElementById('clip_box');
        if(clip_box){
            clip_box.remove();
        }
    }

    function create_clip_box(){
        var middle_row = document.getElementById('middle-row');
        if(middle_row){
            middle_row.innerHTML = `
            <div class="clip_box">
                <button id="lt_button">&lt;</button>
                <span id="current_clip_id"></span> <span id="clip_box_content"></span>
                <button id="gt_button">&gt;</button>
            </div>
        `;
        }
        
        document.head.insertAdjacentHTML(
            "beforeend",
            `
            <style>
                .clip_box { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    gap: 10px; 
                    padding: 10px; 
                    width: auto; 
                    text-align: center; 
                    border-radius: 12px;
                    font-size: 14px;
                    background-color: rgba(255,255,255,0.1);
                    color: var(--yt-formatted-string-bold-color,inherit);
                } 

                button { 
                    background: none;
                    color: inherit;
                    border: none;
                    padding: 0;
                    font: inherit;
                    cursor: pointer;
                    outline: inherit;
                }
                #lt_button {
                    position: absolute;
                    left: 20px;
                }
                #gt_button {
                    position: absolute;
                    right: 20px;
                }

                #current_clip_id {
                    color: var(--yt-endpoint-color, var(--yt-spec-call-to-action));
                }
            </style>
            `
        );

    }
    function jump(time){
        console.log("Jumping to: ", time);
        document.querySelector(".html5-video-container").firstChild.currentTime = parseInt(time);
    }
    function update_box_data(clip){
        var clip_box_content = document.getElementById('clip_box_content');
        
        clip_box_content.innerHTML = `| ${clip.author.name} - ${clip.message} | ${clip.hms} | `;
        if(clip.delay < 0) {
            clip_box_content.innerHTML += `Delay: ${Math.abs(clip.delay)}s`;   
        }
        else{
            clip_box_content.innerHTML += `Ahead: ${clip.delay}s`;   
        }
    }
    function get_to_clip(reverse = false) {
        console.log('Getting to clip');
    
        if (!data || data.length === 0) {
            console.warn('No clip data available.');
            return;
        }
    
        let currentClipIdElem = document.getElementById('current_clip_id');
        if (!currentClipIdElem) {
            console.warn('Element with ID "current_clip_id" not found.');
            return;
        }
    
        let copyData = reverse ? data.slice().reverse() : data;
        let currentClipId = currentClipIdElem.innerText.trim();
        let currentClip = copyData[0]; // Default to the first clip
    
        if (currentClipId) {
            for (let i = 0; i < copyData.length; i++) {
                if (copyData[i].id == currentClipId) { // Loose equality allows string/number match
                    currentClip = (i === copyData.length - 1) ? copyData[0] : copyData[i + 1]; // Loop back to first if at the end
                    break;
                }
            }
        }
    
        currentClipIdElem.innerText = currentClip.id;
        update_box_data(currentClip);
        jump(currentClip.clip_time);
        console.log('Switched to clip:', currentClip.id);
    }
    
    async function run(){
        console.log('Streamsnip Running');
        videoId = null;
        last_video_id;
        // get current url
        let url = window.location.href;
        if(url.includes("watch")){
            let urlParts = url.split('/');
            videoId = urlParts[urlParts.length-1];
            videoId = videoId.split('?')[1].split('v=')[1];
            videoId = videoId.split('&')[0];
        }
        else if(url.includes("embed")){
            // https://www.youtube.com/embed/xk7tr39tx1E?start=15202&autoplay=1
            let urlParts = url.split('/');
            videoId = urlParts[urlParts.length-1];
            videoId = videoId.split('?')[0];
        }
        else{
            // not on a watch page
            last_video_id = null;
            console.log("Streamsnip: not on a watch page.")
            while(window.location.href == url){
                await delay(5000);
            }
            run();
            return;
        }
        console.log('Video ID:', videoId);
        preview_bar = document.getElementById('sspreviewbar');
        if (preview_bar){
            console.log('Removing preview bar');
            preview_bar.remove();
        }
        qurl = 'https://streamsnip.com/extension/clips/' + videoId;
        response = await fetch(qurl);
        data = await response.json();
        if(!data.length){ // WHY JS WHY. WHY CAN"T I JUST DO !data 
            console.log("No clips found");
            remove_clip_box();
            return;
        }
        create_clip_box(); // create a box to show the clip message 
        setInterval(update_duration, 1000, data);
        progreess_bar = document.querySelectorAll('.ytp-progress-bar');
        container = document.querySelector('.ytp-progress-bar-container');
        ul = document.createElement('ul');
        tooltip_text = document.querySelectorAll(".ytp-tooltip-text");
        if(tooltip_text.length > 0){
            tooltip_text = tooltip_text[0];
        }
        ul.id = 'sspreviewbar';
        total_time = parseInt(progreess_bar[0].getAttribute('aria-valuemax'));
        lookuptable = []; // star_time, end_time, message
        for(let i=0; i<data.length; i++){
            clip = data[i];
            start_time = clip.clip_time
            end_time = clip.clip_time - clip.delay;
            if(start_time < end_time){
                start_time, end_time = end_time, start_time;
            }
            // int start_time and end_time
            start_time = parseInt(start_time);
            end_time = parseInt(end_time);

            bar = document.createElement('li');
            bar.classList.add('sspreviewbar');
            bar.innerHTML = '&nbsp;';
            bar.style.position = "absolute";
            bar.style.left = timeToPercentage(start_time, total_time) + '%';
            bar.style.right = timeToRightPercentage(end_time, total_time) + '%';
            ul.appendChild(bar);
            lookuptable.push({'start_time': start_time, 'end_time': end_time, 'message': clip.message}); 
        }
        container.appendChild(ul);
        seekBar = document.querySelector(".ytp-progress-bar-container");
        if(!seekBar){
            return;
        }
        mouseOnSeekBar = false;

        seekBar.addEventListener("mouseenter", () => {
            mouseOnSeekBar = true;
        });

        seekBar.addEventListener("mouseleave", () => {
            mouseOnSeekBar = false;
        });
        last_mouse_position = null;
        seekBar.addEventListener("mousemove", handlehower);   
        console.log("adding event listeners");
        var lt = document.getElementById('lt_button');
        var gt = document.getElementById('gt_button');
        lt.addEventListener('click', () => {
            get_to_clip(true);
        });
        gt.addEventListener('click', () => {
            get_to_clip(false);
        });
        // wait for page to load and then wait 1 second and then call get_to_clip
        // add a while true loop to rerun the function on page change / vide change . and remove all the eventlistners
        while(window.location.href == url){
            await delay(5000);
        }
        seekBar.removeEventListener("mousemove", handlehower);
        // remove the ul element of id sspreviewbar
        preview_bar = document.getElementById('sspreviewbar');
        if (preview_bar){
            console.log('Removing preview bar');
            preview_bar.remove();
        }
        remove_clip_box();
        run();
    };

    run();
})();
