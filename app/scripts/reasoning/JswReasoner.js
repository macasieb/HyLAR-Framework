/**
 * Created by Spadon on 14/10/2014.
 */

var reasoner
var CONFIG = {};

/**
 * Main task
 */
function startReasoner(data) {

    /* déjà parsé, no need
      var json;

    try {
        json = eval(jsonString);
    } catch (ex) {
        json = eval("(" + jsonString + ")");
    }

    send(new Date().toTimeString() + " -> JSON string: " + typeof(json));
    */

    /**
     * Creating a reasoner object for the given ontology
     */
    try {
        reasoner = data.reasoner;
        CONFIG.rdf = data.rdf;
        send({msg: 'Reasoner worker ready', toggleLoads:true});
    } catch(err) {
        send({ msg: "Reasoner unavailable. " + err.toString(), isError:true, toggleLoads: true });
    }
}

function queryReasoner(queryString) {
    /**
     * Creating SPARQL query
     */

    try {
        var query = sparql.parse(queryString);
    } catch(err) {
        send({ msg: "SPARQL parsing failed. " + err.toString(), isError:true, toggleLoads: true });
    }


    /**
     * Querying the reasoner
     */

    try {
        reasoner.aBox.__proto__ = TrimQueryABox.prototype;

        var results = reasoner.aBox.answerQuery(query);
        send({
            msg: "Query : " + query.triples.length + " triple(s), " + query.variables.length + " variable(s). Results : " + results.length,
            toggleLoads: true
        });
        if(results.length) send({sparqlResults: results});
    } catch(err) {
        send({ msg: 'Error while evaluating. ' + err.toString(), isError: true, toggleLoads: true })
    }

}