import xlrd
import json
import datetime

def convert_to_date_string(value):
    return datetime.datetime(*xlrd.xldate_as_tuple(value, xlrd.Book.datemode)).isoformat()

FILENAME = "Exported FlightLegs From 2017-07-24 To 2017-07-30[1].xlsx"


xl_workbook = xlrd.open_workbook(FILENAME)


sheet = xl_workbook.sheet_by_index(0)

column_names = sheet.row_values(0)

table_data = []

for rownum in xrange(1, sheet.nrows):
    values = sheet.row_values(rownum)
    row_data = dict(zip(column_names, values))

    row_data["Id"] = int(row_data["Id"])
    row_data["LOF_ID"] = int(row_data["LOF_ID"])

    row_data["DEP_TIME"] = convert_to_date_string(row_data["DEP_TIME"])
    row_data["DEP_LOCAL_TIME"] = convert_to_date_string(row_data["DEP_LOCAL_TIME"])
    row_data["ARR_TIME"] = convert_to_date_string(row_data["ARR_TIME"])
    row_data["ARR_LOCAL_TIME"] = convert_to_date_string(row_data["ARR_LOCAL_TIME"])
    row_data["DATE"] = convert_to_date_string(row_data["DATE"])

    table_data.append(row_data)


with open("js/data/flights_data.js", "w") as f:
    f.write("var flightData = " + json.dumps(table_data))

