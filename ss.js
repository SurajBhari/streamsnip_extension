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
                span = document.createElement('span');
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
        preview_bar = document.getElementById('previewbar');
        if (preview_bar){
            console.log('Removing preview bar');
            preview_bar.remove();
        }
        qurl = 'https://streamsnip.com/extension/clips/' + videoId;
        response = await fetch(qurl);
        data = await response.json();
        if(!data){
            return;
        }
        setInterval(update_duration, 1000, data);
        progreess_bar = document.querySelectorAll('.ytp-progress-bar');
        container = document.querySelector('.ytp-progress-bar-container');
        ul = document.createElement('ul');
        tooltip_text = document.querySelectorAll(".ytp-tooltip-text");
        if(tooltip_text.length > 0){
            tooltip_text = tooltip_text[0];
        }
        ul.id = 'previewbar';
        ul.classList.add('previewbarstyle');
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
            bar.classList.add('previewbar');
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
        // add a while true loop to rerun the function on page change / vide change . and remove all the eventlistners
        while(window.location.href == url){
            await delay(5000);
        }
        seekBar.removeEventListener("mousemove", handlehower);
        // remove the ul element of id previewbar
        preview_bar = document.getElementById('previewbar');
        if (preview_bar){
            console.log('Removing preview bar');
            preview_bar.remove();
        }
        run();
    };

    run();
})();
