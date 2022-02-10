import flask as fl
import sqlite3 as sql
from datetime import date, timedelta
import sys
import json

Flask = fl.Flask
dbpath = 'app.db'

app = Flask(__name__)
app.secret_key = 'placeholder01412487123wdfkloj124'


###########
## Flask ##
###########

# Basic template endpoints

@app.route('/')
@app.route('/index')
def index():
    return fl.render_template('index.html', loggedIn=str(isLoggedIn()))


@app.route('/create')
def create():
    return fl.render_template('create.html')


@app.route('/log')
def log():
    islogged = isLoggedIn()
    habits = [('not logged in')];
    if islogged:
        habits = sql_select(f"select name from habit where userID = '{fl.session['userID']}'")
    printerr(habits);
    sanitizedHabits = []
    for habit in habits:
        sanitizedHabits.append(habit[0])
    printerr(sanitizedHabits)
    return fl.render_template('log.html', habits=sanitizedHabits);


@app.route('/loginForm')
def loginForm():
    return fl.render_template('login.html')


@app.route('/help')
def help_():
    return fl.render_template('help.html')


@app.route('/reports')
def reports():
    conn = create_connection(dbpath)
    ## Game plan

    # 1. Find all habits tracked by the current user (only uploaded data counts)
    habits = sql_select_c(conn,
                          f'SELECT name, startDate, frequency, id FROM habit WHERE userID = {fl.session["userID"]}')
    today = date.today()
    iterable = []
    for habit in habits:
        startDate = date.fromisoformat(habit[1])
        frequency = timedelta(habit[2])
        timeSinceStart = today - startDate
        printerr(f'habit started {timeSinceStart} ago')
        if timeSinceStart.days < 0:  # probably just skip
            continue

        # 2. Determine the last 10 dates when the habit should be upheld.
        # Can be less, if the habit is new!
        _, timeSinceLast = divmod(timeSinceStart, frequency)
        printerr(f'Last instance: {timeSinceLast} days ago on {today - timeSinceLast}')
        last10Instances = [today - timeSinceLast]
        if last10Instances[-1] < startDate:  # probably just skip this habit, again
            continue
        for i in range(10):
            instance = last10Instances[-1] - frequency
            if instance < startDate:
                break
            last10Instances.append(instance)

        # 3. Determine whether the habit WAS upheld.
        wasUpheld = []
        every = sql_select_c(conn, f'SELECT * FROM activity')
        printerr(every)
        for instance in last10Instances:
            printerr(f'Testing on {date.isoformat(instance)}')
            res = sql_select_c(conn,
                               f"SELECT * FROM activity WHERE habitID = {habit[3]} AND date = '{date.isoformat(instance)}'")
            printerr(res)
            wasUpheld.append(True if res else False)
        # 4. Collate results in iterables for template.
        habitSummary = (reversed(last10Instances), reversed(wasUpheld))
        iterable.append(habitSummary)
    # iterable contains iterables. each is a list of tuples (instance, wasUpheld).
    habitNames = [habit[0] for habit in habits]
    package = zip(habitNames, iterable)
    return fl.render_template('report.html', package=package)


# Actions

@app.route('/login', methods=['GET', 'POST'])
def login():
    printerr(f'Username: {fl.request.args["username"]}')
    printerr(f'Password: {fl.request.args["password"]}')
    res = sql_select(f"""select * from user 
		where username = '{fl.request.args['username']}'
		and password = '{fl.request.args['password']}'
		""")
    if (len(res) != 0):
        fl.session['userID'] = res[0][0]
        printerr(f'User {fl.session["userID"]} logged in!')
        return fl.render_template('index.html', loggedIn=str(isLoggedIn()))
    else:
        return fl.render_template_string("""
			<html>
			<head></head>
			<body>
				<p>Niepoprawne hasło lub nazwa użytkownika.</p>
				<a href="{{url_for('index')}}">Wróć do strony głównej.</a>
			</body>
			</html>
			""")


@app.route('/register')
def register():
    printerr(f'Username: {fl.request.args["username"]}')
    printerr(f'Password: {fl.request.args["password"]}')
    same_username = sql_select(f"""
		select * from user where username = '{fl.request.args['username']}'
		""")
    if same_username:
        return fl.render_template_string("""
			<html>
			<head></head>
			<body>
				<p>Użytkownik o takiej nazwie już istnieje.</p>
				<a href="{{url_for('index')}}">Wróć do strony głównej.</a>
			</body>
			</html>
			""")
    sql_query(f"""
		insert into user values ({getNextID('user')},'{fl.request.args["username"]}','{fl.request.args["password"]}')
		""")
    return fl.render_template_string("""
		<html>
		<head></head>
		<body>
			<p>Zarejestrowano nowe konto. Teraz możesz się zalogować.</p>
			<a href="{{url_for('index')}}">Wróć do strony głównej.</a>
		</body>
		</html>
		""")


@app.route('/logout')
def logout():
    print(fl.request.args['userid'])
    fl.session['userID'] = None;
    return ('', 200)


@app.route('/isLoggedIn')
def isLoggedInRequest():
    loggedIn = True if fl.session.get('userID') else False
    ret = {'userID': fl.session.get('userID'), 'loggedIn': loggedIn}
    print(fl.jsonify(ret))
    return ret


def isLoggedIn():
    return True if fl.session.get('userID') else False


@app.route('/uploadLocalHabit', methods=['POST'])
def uploadLocalHabit():
    conn = create_connection(dbpath)
    printerr(
        f'name: {fl.request.form["name"]}, startDate: {fl.request.form["startDate"]}, interval: {fl.request.form["interval"]}')
    if not isLoggedIn():
        return ('', 204)
    # check if same-named habit exists
    same_name = sql_select_c(conn,
                             f"""select name from habit where userID = {fl.session["userID"]} and name = '{fl.request.form["name"]}'""")
    printerr(same_name)
    printerr(not not same_name)
    if same_name:
        conn.commit()
        conn.close()
        return ('Pominięto powtórzoną nazwę', 200)

    querystring = f"""insert into habit values 
	({getNextID("habit")},
	'{fl.request.form["name"]}',
	{fl.session["userID"]},  
	'{fl.request.form["startDate"]}', 
	{fl.request.form["interval"]})"""

    printerr(querystring)
    sql_query_c(conn, querystring)
    printerr(sql_select_c(conn, 'select * from habit'))
    conn.commit()
    conn.close()
    return ('Dodano nowe przyzwyczajenie', 200)


@app.route('/uploadLocalActivity', methods=['POST'])
def uploadLocalActivity():
    if not isLoggedIn():
        return ('', 204)
    conn = create_connection(dbpath)
    printerr(f'name: {fl.request.form["name"]}, date: {fl.request.form["date"]}')
    # find habit ID
    habitID = sql_select(
        f"""select id from habit where userID = {fl.session["userID"]} and name = '{fl.request.form["name"]}'""")[0][0]
    # check if same-date activity exists
    same_date_query = f"""select date from activity where habitID = {habitID} and date = '{fl.request.form["date"]}'"""
    printerr(same_date_query)
    same_date = sql_select_c(conn, same_date_query)
    printerr(same_date)
    printerr(not not same_date)
    if same_date:
        conn.commit()
        conn.close()
        return ('Ominięto powtórzoną czynność', 200)

    querystring = f"""insert into activity values 
	({getNextID("activity")},
	'{fl.request.form["date"]}',
	{habitID})"""

    printerr(querystring)
    sql_query_c(conn, querystring)
    printerr(sql_select_c(conn, 'select * from activity'))
    conn.commit()
    conn.close()
    return ('Dodano nową czynność', 200)


@app.route('/<path:path>')
def file_request(path):
    return fl.send_from_directory('static', path)


@app.route('/echo/<string:data>')
def echo(data):
    return data


###############
## Non-flask ##
###############

def printerr(content):
    print(content, file=sys.stderr)


# SQLite functions

def create_connection(path):
    connection = None
    try:
        connection = sql.connect(path)
        printerr(f'Connection established to {path}')
    except sql.Error as e:
        printerr(f'Could not establish connection: {e}')
    return connection


def sql_query(query):
    conn = create_connection(dbpath)
    cur = conn.cursor()
    cur.execute(query)
    conn.commit()
    conn.close()


def sql_query_c(conn, query):
    cur = conn.cursor()
    cur.execute(query)


def sql_select(query):
    conn = create_connection(dbpath)
    cur = conn.cursor()
    cur.execute(query)
    result = []
    for row in cur:
        result.append(row)
    conn.commit()
    conn.close()
    return result


def sql_select_c(conn, query):
    cur = conn.cursor()
    cur.execute(query)
    result = []
    for row in cur:
        result.append(row)
    return result


def getNextID(table):
    maxid = sql_select(f'select max(id) from {table}')[0][0]
    return 0 if maxid == None else maxid + 1


def clearDatabase(tables):
    for table in tables:
        sql_query(f'delete from {table}')


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=1306)
