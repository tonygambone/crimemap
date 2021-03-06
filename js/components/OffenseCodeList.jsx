"use strict";

var IncidentDataStore = require('../IncidentDataStore');

var OffenseCodeList = React.createClass({
  propTypes: {
    offenseCodes: React.PropTypes.array
  },

  render: function() {
    var items = this.props.offenseCodes && this.props.offenseCodes.map(function (c) {
      var iconStyle = {
        backgroundColor: c.color
      };
      return (
        <tr className="offense-code-row" key={c.offense_code + c.offense_code_desc}>
          <td><i style={iconStyle}/></td>
          <td>{c.offense_code}</td>
          <td>{c.offense_code_desc}</td>
        </tr>
      );
    });
    if (!items || items.length == 0) return null;
    return (
      <table className="table table-striped table-hover table-condensed small offense-codes">
        <tbody>
          {items}
        </tbody>
      </table>
    );
  }
});

module.exports = OffenseCodeList;
