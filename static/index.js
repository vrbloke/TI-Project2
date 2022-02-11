$(function() {
    fixHiddenButtonAnimations();
    bindEvents();
    animateButtons();
    openDatabase();
})

var db = null;
var userID = -1;
var habits = [];
var activities = [];

function bindEvents() {
    $('#login-button').on('click', loginButtonClicked);
    $('#create-habit-button').on('click', createHabitButtonClicked);
    $('#log-activity-button').on('click', logActivityButtonClicked);
    $('#display-raw-button').on('click', displayRawButtonClicked);
    $('#reports-button').on('click', reportsButtonClicked);
    $('#overlay').on('click', hideResponse);
    //$('#helper-icon').on('click', helperIconClicked);
}

async function openDatabase() {
    console.log('Opening database');
    let req = window.indexedDB.open('db',2);
    req.onerror = event => { console.log(event); }
    req.onsuccess = async function(event) {
        console.log(event);
        db = event.target.result;
        if(await isLoggedIn()) {
            console.log('Attempt to upload local data');
            await uploadLocalData();
            window.indexedDB.deleteDatabase('db').onblocked = event => {console.log('Blocked!');};
        }
    };
    req.onupgradeneeded = event => {
        db = event.target.result;
        db.createObjectStore('habits', { autoIncrement: true });
        db.createObjectStore('activities', { autoIncrement: true });
    };
}

function fixHiddenButtonAnimations() {
    $('.signed-in-button').on('mouseenter', function() {
        $(this).animate({gap: 1.05}, {
            step: function(now, fx) {
                $(this).css('transform', 'scale('+now+')');
            },
            duration: 120,
            easing: 'linear'
        });
    }).on('mouseleave', function() {
        $(this).animate({gap: 1}, {
           step: function(now, fx) {
               $(this).css('transform', 'scale('+now+')');
           },
            duration: 120,
            easing: 'linear'
        });
    }).on('mousedown', function() {
        $(this).animate({gap: 1}, {
            step: function(now, fx) {
                $(this).css('transform', 'scale('+now+')');
            },
            duration: 50
        });
    }).on('mouseup', function() {
        $(this).animate({gap: 1.05}, {
            step: function(now, fx) {
                $(this).css('transform', 'scale('+now+')');
            },
            duration: 50
        });
    });
}

async function animateButtons() {
    if(!await isLoggedIn()) {
        return;
    }
    $('#reports-button').css('visibility','visible').animate(
        { gap: 0 },
        {
            step: function(now, fx) {
                //console.log(now);
                $(this).css('transform', 'translateY('+now+'px');
            },
            duration: 150,
            easing: 'swing',
            done: function() {
                $(this).css('gap', 1);
            }
        }
    );
}

function displayGET(url) {
    $.get(url, function(data, status, jqXHR) {
        displayResponse(data);
    });
}

async function isLoggedIn() {
    let result = 0;
    await $.get('/isLoggedIn', function(data, status, jqXHR) {
        console.log(data);
        result = data['loggedIn'];
        userID = data['userID'];
    });
    return result;
}

async function logout() {
    console.log('Attempt logout')
    $.get({
        url: '/logout',
        data: {
            userid: userID
        },
        dataType: 'json',
        complete: function(data, status) {
            console.log('Logged out.');
            userID = null;
            openDatabase();
            $('#login-button').html('Zaloguj się');
            $('#reports-button').animate(
                { gap: 5 },
                {
                    step: function(now, fx) {
                        //console.log(now);
                        $(this).css('transform', 'translateY('+now+'vw');
                    },
                    duration: 150,
                    easing: 'swing',
                    done: function(a,e) { $(this).css('visibility','hidden'); }
                }
            );
        }
    });
}

function displayResponse(html) {
    $('#buttons').hide();
    $('#overlay').show();
    $('#response').html(html).show();
}

function hideResponse() {
    $('#response').hide();
    $('#overlay').hide();
    $('#buttons').show();
}

function displayNotification(text) {
    $('#notification').html(text).show().fadeOut(2000);
}

/**
 * If not logged in -- provide login form.
 * If login is successful, change into logout button, modify UI.
 * If logged in -- log out, modify UI.
 */
async function loginButtonClicked() {
    if(!await isLoggedIn()) {
        displayGET('/loginForm');
    }
    else {
        logout();
    }
}

/**
 * Provide habit creation form (template).
 */
function createHabitButtonClicked() {
    displayGET('/create');
}

/**
 * Provide activity logging form (template).
 */
function logActivityButtonClicked() {
    displayGET('/log');
}

/**
 * Iterate through local data, send each entry to the database
 * with a request
 */
async function uploadLocalData() {
    db.transaction(['habits']).objectStore('habits').getAll().onsuccess = async function(event) {
        let habits = event.target.result;
        console.log('Habits!');
        console.log(habits);
        for(let i = 0; i < habits.length; i++) {
            console.log(habits[i]);
            await $.post({
                url:'/uploadLocalHabit',
                data: habits[i],
                success: function(data,e,x) { console.log("Success"); displayNotification(data); }
            });
        }
        db.transaction(['activities']).objectStore('activities').getAll().onsuccess = async function(event) {
            let activities = event.target.result;
            for(let i = 0; i < activities.length; i++) {
                await $.post({
                    url:'/uploadLocalActivity',
                    data: activities[i],
                    success: function(data,e,x) { console.log("Success"); displayNotification(data); }
                });
            }
        }
    };
    displayNotification('Przesłano lokalne dane!');
}


/**
 * Display reports tailored for this user template.
 */
function reportsButtonClicked() {
    displayGET('/reports')
}

async function displayRawButtonClicked() {
    if(await isLoggedIn()) {
        html = `<p>Jesteś zalogowany. Wyświetlam dane online.</p>`
        $.get('/fullTables', (data, status, jqXHR) => {
            console.log(data);
            html += `<p>Przyzwyczajenia</p>
            <table class="draw-borders"><tr><th>Nazwa</th><th>Data rozpoczęcia</th><th>Częstotliwość</th></tr>`
            data['habits'].forEach(habit => {
                html += `<tr><td>${habit[0]}</td><td>${habit[1]}</td><td>${habit[2]}</td></tr>`;
            });
            html += '</table><p>Aktywności</p>';
            html += `<table class="draw-borders"><tr><th>Nazwa przyzwyczajenia</th><th>Data</th></tr>`;
            data['activities'].forEach(activity => {
                html += `<tr><td>${activity[0]}</td><td>${activity[1]}</td></tr>`;
            });
            html += `</table>`;
            displayResponse(html);
        });
    }
    else {
        html = `<p>Nie jesteś zalogowany/a: Wyświetlam dane lokalne.</p><p>Przyzwyczajenia</p>
        <table class="draw-borders"><tr><th>Nazwa</th><th>Data rozpoczęcia</th><th>Częstotliwość</th></tr>`;
        db.transaction(['habits']).objectStore('habits').getAll().onsuccess = event => {
            let res = event.target.result;
            res.forEach(habit => {
                html += `<tr><td>${habit.name}</td><td>${habit.startDate}</td><td>${habit.interval}</td></tr>`;
            });
            html += `</table>`;
            html += `<p>Aktywności</p>`;
            html += `<table class="draw-borders"><tr><th>Nazwa przyzwyczajenia</th><th>Data</th></tr>`;
            db.transaction(['activities']).objectStore('activities').getAll().onsuccess = event => {
                let res = event.target.result;
                res.forEach(activity => {
                    html += `<tr><td>${activity.name}</td><td>${activity.date}</td></tr>`
                });
                html += `</table>`;
                displayResponse(html);
            }
        }
    }
}

//function helperIconClicked() {
//    displayGET(homeUrl + '/help')
//}