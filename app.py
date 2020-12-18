from flask import Flask, request, make_response, jsonify, render_template
import pandas as pd
import numpy as np
import geopandas as gpd
import matplotlib.pyplot as plt
import json
from flask_cors import CORS

import matplotlib
matplotlib.use('Agg')

from matplotlib.figure import Figure
import io
from matplotlib.backends.backend_agg import FigureCanvasAgg


app = Flask(__name__)
CORS(app)

df = gpd.read_file("districts2.geojson")

columns = ['Organisation unit ID',
          'Organisation unit',
           'Organisation unit code',
           'Organisation unit description',
           'Reporting month',
           'Organisation unit parameter',
           'Organisation unit is parent',
           'Palu % Toutes Consultations',
           'Palu % Confirmation',
           'palu incidence',
           'population couverte',
           'palu cas confirmés'
          ]

@app.route('/')
def index():
    return render_template("index.html", message="Hello Flask!");
    #return "<h1>Welcome to the Guinea Malaria map server !!</h1>"

@app.route('/getmsg/', methods=['GET'])
def respond():
    # Retrieve the name from url parameter
    name = request.args.get("name", None)

    # For debugging
    print(f"got name {name}")

    response = {}

    # Check if user sent a name at all
    if not name:
        response["ERROR"] = "no name found, please send a name."
    # Check if the user entered a number not a name
    elif str(name).isdigit():
        response["ERROR"] = "name can't be numeric."
    # Now the user entered a valid name
    else:
        response["MESSAGE"] = f"Welcome {name} to the Guinea map server!!"

    # Return the response in json format
    return jsonify(response)

@app.route('/post/', methods=['POST'])
def post_something():
    name = request.form.get('name')
    print(name)
    # You can add the test cases you made in the previous function, but in our case here you are just testing the POST functionality
    if name:
        return jsonify({
            "Message": f"Welcome {name} to our awesome platform!!",
            # Add this option to distinct the POST request
            "METHOD" : "POST"
        })
    else:
        return jsonify({
            "ERROR": "no name found, please send a name."
        })


@app.route('/consultations.png', methods=['POST'])
def get_consultations():
    if request.method == 'POST':
        return makemap(columns[7])

@app.route('/confirmations.png', methods=['POST'])
def get_confirmations():
    if request.method == 'POST':
        return makemap(columns[8])

@app.route('/incidence.png', methods=['POST'])
def get_incidence():
    if request.method == 'POST':
        return makemap(columns[9])

@app.route('/population.png', methods=['POST'])
def get_population():
    if request.method == 'POST':
        return makemap(columns[10])

@app.route('/totalconfirmed.png', methods=['POST'])
def get_totalconfirmed():
    if request.method == 'POST':
        return makemap(columns[11])

# the varible has to be in the request body
def makemap(variable):

    content = request.json


    if "rows" not in content:
        resp = make_response("Invalid Report", 400)
        return resp

    pivot_table_df = pd.DataFrame(content["rows"], columns=columns)


    # join the geodataframe with the csv dataframe
    merged = df.merge(pivot_table_df, how='left', left_on="ORG_CODE", right_on="Organisation unit code")

    # set the range for the choropleth values
    vmin, vmax = 0, 100

    # create figure and axes for Matplotlib
    fig, ax = plt.subplots(1, figsize=(10, 10))

    # remove the axis
    ax.axis('off')
    ax.set_title(variable,
                 fontdict={'fontsize': '16', 'fontweight': '3'})

    # Create colorbar legend
    sm = plt.cm.ScalarMappable(cmap='Blues', norm=plt.Normalize(vmin=vmin, vmax=vmax))

    # empty array for the data range
    sm.set_array([])

    # or alternatively sm._A = []. Not sure why this step is necessary, but many recommends it# add the colorbar to the figure
    # fig.colorbar(sm)
    fig.colorbar(sm, orientation="horizontal", fraction=0.036, pad=0.1, aspect=30)

    # Add Labels
    merged['coords'] = merged['geometry'].apply(lambda x: x.representative_point().coords[:])
    merged['coords'] = [coords[0] for coords in merged['coords']]

    # Add district names
    for idx, row in merged.iterrows():
        plt.annotate(text=row['NAME_2'], xy=row['coords'], horizontalalignment='center')

    merged.plot(column=variable, cmap='Blues', linewidth=0.8, ax=ax, edgecolor='0.8')

    canvas = FigureCanvasAgg(fig)
    output = io.BytesIO()
    canvas.print_png(output)
    response = make_response(output.getvalue())
    response.mimetype = 'image/png'

    return response


if __name__ == '__main__':
    app.run(host= '0.0.0.0',debug=True)
