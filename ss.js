(function() {
    'use strict';
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
        var current_time = document.getElementsByClassName("ytp-time-current")[0].textContent;  
        current_time = current_time.split(':');
        var seconds = 0;
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
                var span = document.createElement('span');
                span.id = 'clip_message';
                span.innerHTML = " •  " +message;
                document.getElementsByClassName("ytp-time-duration")[0].parentElement.append(span);
                return; // there can be only one message at a time
            }
            
        }
        var clip_message = document.getElementById('clip_message');
        if(clip_message){
            clip_message.remove();
        }
    }
    async function run(){
        console.log('Streamsnip Running');
        var videoId = null;
        var last_video_id;
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
        let qurl = 'https://streamsnip.com/extension/clips/' + videoId;
        let response = await fetch(qurl);
        var data = await response.json();
        if(!data){
            return;
        }
        setInterval(update_duration, 1000, data);
        var progreess_bar = document.querySelectorAll('.ytp-progress-bar');
        var container = document.querySelector('.ytp-progress-bar-container');
        var ul = document.createElement('ul');
        var tooltip_text = document.querySelectorAll(".ytp-tooltip-text");
        if(tooltip_text.length > 0){
            tooltip_text = tooltip_text[0];
        }
        ul.id = 'previewbar';
        ul.classList.add('previewbarstyle');
        var total_time = parseInt(progreess_bar[0].getAttribute('aria-valuemax'));
        var lookuptable = []; // star_time, end_time, message
        for(let i=0; i<data.length; i++){
            var clip = data[i];
            var start_time = clip.clip_time
            var end_time = clip.clip_time - clip.delay;
            if(start_time < end_time){
                start_time, end_time = end_time, start_time;
            }
            // int start_time and end_time
            start_time = parseInt(start_time);
            end_time = parseInt(end_time);

            var bar = document.createElement('li');
            bar.classList.add('previewbar');
            bar.innerHTML = '&nbsp;';
            bar.style.position = "absolute";
            bar.style.left = timeToPercentage(start_time, total_time) + '%';
            bar.style.right = timeToRightPercentage(end_time, total_time) + '%';
            ul.appendChild(bar);
            lookuptable.push({'start_time': start_time, 'end_time': end_time, 'message': clip.message}); 
        }
        container.appendChild(ul);
        const seekBar = document.querySelector(".ytp-progress-bar-container");
        if(!seekBar){
            return;
        }
        let mouseOnSeekBar = false;

        seekBar.addEventListener("mouseenter", () => {
            mouseOnSeekBar = true;
        });

        seekBar.addEventListener("mouseleave", () => {
            mouseOnSeekBar = false;
        });
        var last_mouse_position = null;
        seekBar.addEventListener("mousemove", (e) => {
            const timeInSeconds = ((e.clientX - seekBar.getBoundingClientRect().x) / seekBar.clientWidth);
            if(last_mouse_position == e.clientX){
                return;
            }
            last_mouse_position = e.clientX;
            // timeInSeconds is a value between 0 and 1 then get the time 
            var time = timeInSeconds * total_time;
            time = parseInt(time);
            for(let i=0; i<lookuptable.length; i++){
                if(time >= lookuptable[i].start_time && time <= lookuptable[i].end_time){
                    var message = lookuptable[i].message;
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
        });
    };

    run();
})();
