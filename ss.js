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

    const delay = (delayInms) => {
        return new Promise(resolve => setTimeout(resolve, delayInms));
    };
    const timeToPercentage = (time, total_time) => {
        return (time / total_time) * 100;
    }
    const timeToRightPercentage = (time, total_time) => {
        return 100 - (time / total_time) * 100;
    }

    function get_current_seconds(){
        current_time = document.getElementsByClassName("ytp-time-current")[0].textContent;  
        current_time = current_time.split(':');
        seconds = 0;
        if(current_time.length == 2){
            seconds = parseInt(current_time[0]) * 60 + parseInt(current_time[1]);
        }
        else if(current_time.length == 3){
            seconds = parseInt(current_time[0]) * 3600 + parseInt(current_time[1]) * 60 + parseInt(current_time[2]); 
        }
        seconds = seconds+1; // add 1 second to account for delay
        return seconds;
    }

    function update_duration(data){
        seconds = get_current_seconds();
        
        for(let i=0; i<data.length; i++){
            var clip = data[i];
            var start_time = clip.clip_time
            var end_time = clip.clip_time - clip.delay;
            if(start_time < end_time){
                start_time, end_time = end_time, start_time;
            }
            if(seconds >= start_time && seconds <= end_time){
                var message = clip.message;
                update_box_data(clip);
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
        if(document.getElementById('clip_box')){
            return;
        }// already exists
        var middle_row = document.getElementById('middle-row');
        if(middle_row){
            middle_row.innerHTML = `
            <div id="clip_box">
                <button id="lt_button">&lt;</button>
                <span id="current_clip_id"></span> | <span id="clip_box_author_name"></span> - <span id="clip_box_message"></span> | <span id="clip_box_hms"></span> | <span id="clip_box_delay"></span>
                <button id="gt_button">&gt;</button>
            </div>
        `;
        }
        
        document.head.insertAdjacentHTML(
            "beforeend",
            `
            <style>
                #clip_box { 
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
        if(!time){
            return;
        }
        document.querySelector(".html5-video-container").firstChild.currentTime = parseInt(time);
    }
    function update_box_data(clip){
        // <span id="current_clip_id"></span> | <span id="clip_box_author_name"></span> - <span id="clip_box_message"></span> | <span id="clip_box_hms"></span> | <span id="clip_box_delay"></span>
        var current_clip_id = document.getElementById('current_clip_id');
        var clip_box_author_name = document.getElementById('clip_box_author_name');
        var clip_box_message = document.getElementById('clip_box_message');
        var clip_box_hms = document.getElementById('clip_box_hms');
        var clip_box_delay = document.getElementById('clip_box_delay');
        if(!current_clip_id){
            return;
        }
        current_clip_id.innerText = clip.id;
        clip_box_author_name.innerText = clip.author.name;
        clip_box_message.innerText = clip.message;
        clip_box_hms.innerText = clip.hms;
        
        if(clip.delay < 0) {
            clip_box_delay.innerText = `Delay: ${Math.abs(clip.delay)}s`;   
        }
        else{
            clip_box_delay.innerText = `Ahead: ${clip.delay}s`;   
        }
    }
    function get_to_clip(reverse = false) {
        seconds = get_current_seconds();
        // find the closest clip in lookuptable
        var currentClip = null;
        for(let i=0; i<lookuptable.length; i++){
            var clip = lookuptable[i];
            if(reverse){
                if(clip.end_time < seconds){
                    if(!currentClip || clip.end_time > currentClip.end_time){
                        currentClip = clip;
                    }
                }
            }
            else{
                if(clip.start_time > seconds){
                    if(!currentClip || clip.start_time < currentClip.start_time){
                        currentClip = clip;
                    }
                }
            }   
        }
        if(!currentClip){
            console.log("No more clips in this direction");
            if(reverse){
                // jump to end
                currentClip = lookuptable[lookuptable.length - 1];

            }
            else{
                // jump to start
                currentClip = lookuptable[0];
            }
        }
        // now get the actual clip data from data
        for(let i=0; i<data.length; i++){
            if(data[i].id == currentClip.id){
                currentClip = data[i];
                break;
            }
        }
        
        jump(currentClip.clip_time);
        update_box_data(currentClip);
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
        // iterate over data and if any clip.id are repeated then merge them by adding author names and messages
        for(let i=0; i<data.length; i++){
            for(let j=i+1; j<data.length; j++){
                if(data[i].id == data[j].id){
                    data[i].author.name += `, ${data[j].author.name}`;
                    data[i].message += ` AND ${data[j].message}`;
                    data.splice(j, 1);
                    j--;
                    console.log("Merged duplicate clip id:", data[i].id);
                }
            }
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
        lookuptable = []; // star_time, end_time, message, id
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
            lookuptable.push({'start_time': start_time, 'end_time': end_time, 'message': clip.message, 'id': clip.id}); 
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
    };
    let lastUrl = location.href;
    setInterval(() => {
    if (location.href !== lastUrl) {
        console.log('URL changed to ' + location.href);
        lastUrl = location.href;
        run();
    }
    }, 500);

    run();
})();
