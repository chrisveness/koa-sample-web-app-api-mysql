/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
/* Cast MySQL BIT(1) / TINYINT(1) values to/from JavaScript true/false/null values                */
/*                                                                                                */
/* Generally JavaScript will coerce MySQL numeric 1/0/null to true/false/null, and MySQL will     */
/* coerce true/false/null to numeric 1/0/null. However, the API should send boolean rather than   */
/* numeric values.                                                                                */
/*                                                                                                */
/* For JSON, MySQL booleans should be translated into true/false/null, rather then being left as  */
/* integers.                                                                                      */
/*                                                                                                */
/* For XML, MySQL booleans should be translated into 'true'/'false'/'', and nulls should have an  */
/* 'xsi:nil' attribute.                                                                           */
/*                                                                                                */
/* Posted values should have 'true'/'false'/'' translated to true/false/null.                     */
/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */

'use strict';

const castBoolean = {};


/**
 * Cast query results for MySQL BIT(1) / TINYINT(1) fields from MySQL numeric values to JavaScript
 * boolean values.
 *
 * @param   {Array} result - Query result returned by mysq2 query().
 * @returns {Array} [rows, fields] Same as ‘results’, but with properly cast booleans.
 *
 * @example
 *   const result = yield this.state.db.query('Select * From User');
 *   const [users] = castBoolean.fromMysql(result);
 */
castBoolean.fromMysql = function(result) {
    const [rows, fields] = result;
    const rowsCast = rows.map(row => {
        fields.forEach(field => { // note 0x01 = TINYINT, 0x10 = BIT; how best to access mysql.Types from here?
            const boolean = (field.columnType==0x01 || field.columnType==0x10) && field.columnLength==1;
            if (boolean) row[field.name] = row[field.name]===null ? null : row[field.name]==1;
        });
        return row;
    });
    return [rowsCast, fields];
};


/**
 * Cast string true/false/null values (as received by API POST/PATCH body) to JavaScript booleans
 * where table fields are MySQL BIT(1) / TINYINT(1).
 *
 * @param   {string} table Name of table values are being cast for (field types are checked)
 * @param   {Object} values
 * @returns {Object} Converted values
 *
 * @example
 *   this.request.body = yield castBoolean.fromStrings('Member', this.request.body);
 *   const id = yield User.insert(this.request.body);
 */
castBoolean.fromStrings = function*(table, values) {
    const castValues = values;
    const fields = yield global.db.query('Describe '+table);
    fields[0].forEach(field => {
        const boolean = field.Type=='tinyint(1)' || field.Type=='bit(1)';
        if (boolean && field.Field in values) {
            castValues[field.Field] = values[field.Field]=='' ? null : JSON.parse(values[field.Field].toLowerCase());
        }
    });
    return castValues;
};


module.exports = castBoolean;

/* - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -  */
