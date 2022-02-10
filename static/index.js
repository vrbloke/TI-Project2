$(function() {
    fixHiddenButtonAnimations();
    bindEvents();
    animateButtons();
})

var userID = -1;
var habits = [];
var activities = [];

function bindEvents() {
    $('#login-button').on('click', loginButtonClicked);
    $('#create-habit-button').on('click', createHabitButtonClicked);
    $('#log-activity-button').on('click', logActivityButtonClicked);
    $('#upload-data-button').on('click', uploadDataButtonClicked);
    $('#reports-button').on('click', reportsButtonClicked);
    $('#overlay').on('click', hideResponse);
    //$('#helper-icon').on('click', helperIconClicked);
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
    $('#upload-data-button').css('display','block').animate(
        { gap: 0.00001 },
        {
            step: function(now, fx) {
                //console.log(now);
                $(this).css('transform', 'translateY(-'+now+'px');
            },
            duration: 150,
            easing: 'swing',
            done: function() {
                $(this).css('gap', 1);
            }
        }
    );
    $('#reports-button').css('display','block').animate(
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
    await $.get(homeUrl + '/isLoggedIn', function(data, status, jqXHR) {
        console.log(data);
        result = data['loggedIn'];
        userID = data['userID'];
    });
    return result;
}

async function logout() {
    console.log('Attempt logout')
    $.get({
        url: homeUrl +'/logout',
        data: {
            userid: userID
        },
        dataType: 'json',
        complete: function(data, status) {
            console.log('Logged out.');
            userID = null;
            $('#login-button').html('Zaloguj się');
            $('#upload-data-button').animate(
                { gap: 5 },
                {
                    step: function(now, fx) {
                        //console.log(now);
                        $(this).css('transform', 'translateY(-'+now+'vw');
                    },
                    duration: 150,
                    easing: 'swing',
                    done: function(a,e) { $(this).css('display','none'); }
                }
            )
            $('#reports-button').animate(
                { gap: 5 },
                {
                    step: function(now, fx) {
                        //console.log(now);
                        $(this).css('transform', 'translateY('+now+'vw');
                    },
                    duration: 150,
                    easing: 'swing',
                    done: function(a,e) { $(this).css('display','none'); }
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
        displayGET(homeUrl + '/loginForm');
    }
    else {
        logout();
    }
}

/**
 * Provide habit creation form (template).
 */
function createHabitButtonClicked() {
    displayGET(homeUrl + '/create');
}

/**
 * Provide activity logging form (template).
 */
function logActivityButtonClicked() {
    displayGET(homeUrl + '/log');
}

/**
 * Iterate through local data, send each entry to the database
 * with a request
 */
async function uploadDataButtonClicked() {
    if(!isLoggedIn()) {
        return;
    }
    console.log(habits);
    console.log(activities);
    for(let i = 0; i < habits.length; i++) {
        await $.post({
            url:homeUrl + '/uploadLocalHabit',
            data: habits[i],
            success: function(data,e,x) { console.log("Success"); displayNotification(data); }
        });
    }
    for(let i = 0; i < activities.length; i++) {
        await $.post({
            url:homeUrl + '/uploadLocalActivity',
            data: activities[i],
            success: function(data,e,x) { console.log("Success"); displayNotification(data); }
        });
    }
    displayNotification('Przesłano lokalne dane!');
}


/**
 * Display reports tailored for this user template.
 */
function reportsButtonClicked() {
    displayGET(homeUrl + '/reports')
}

//function helperIconClicked() {
//    displayGET(homeUrl + '/help')
//}