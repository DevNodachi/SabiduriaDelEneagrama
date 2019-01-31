var express = require('express');
var router = express.Router();
var mongo = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var assert = require('assert');
var Request = require('request');
var Chance = require('chance');
var chance = new Chance();
var mysql = require('mysql');

var conn = mysql.createConnection({
  host: "0.0.0.0",
  user: "dev",
  password: "123456",
  multipleStatements: true
});

var url = 'mongodb://localhost:27017/profileusers';

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/user', function(req, res, next) {
  res.render('user');
});

router.get('/simulation', function(req, res, next) {
  res.render('simulation');
});

router.post('/start-simulation', function(req, res, next) {
  Request.get("https://randomuser.me/api/?results=" + parseInt(req.body.randomvalue) + "&exc=login,phone,cell,picture", (error, response, body) => {
    if (error) {
      return console.dir(error);
    }
    var listofusers = [];

    var randomusers = JSON.parse(body);
    for (user of randomusers.results) {
      var user_tiene_hermanos = chance.integer({
        min: 0,
        max: 1
      });

      var item;

      if (user_tiene_hermanos == 0) {
        item = {
          cedula: chance.integer({
            min: 1000000,
            max: 30000000
          }),
          genero: user.gender,
          nacimiento: user.dob.date,
          edad: user.dob.age,
          estado: user.location.state,
          ciudad: user.location.city,
          profesion: chance.profession(),
          estado_civil: chance.integer({
            min: 0,
            max: 1
          }),
          trabaja: chance.integer({
            min: 0,
            max: 1
          }),
          vivir_padres: chance.integer({
            min: 0,
            max: 1
          }),
          tiene_hermanos: user_tiene_hermanos,
          cuantos_hermanos: 0,
          registro: user.registered.date
        }
      } else {
        item = {
          cedula: chance.integer({
            min: 1000000,
            max: 30000000
          }),
          genero: user.gender,
          nacimiento: user.dob.date,
          edad: user.dob.age,
          estado: user.location.state,
          ciudad: user.location.city,
          profesion: chance.profession(),
          estado_civil: chance.integer({
            min: 0,
            max: 1
          }),
          trabaja: chance.integer({
            min: 0,
            max: 1
          }),
          vivir_padres: chance.integer({
            min: 0,
            max: 1
          }),
          tiene_hermanos: user_tiene_hermanos,
          cuantos_hermanos: chance.integer({
            min: 1,
            max: 5
          }),
          registro: user.registered.date
        }
      }
      listofusers.push(item);
    }

    mongo.connect(url, function(err, db) {
      assert.equal(null, err);
      db.collection('userdata').insertMany(listofusers, function(err, result) {
        assert.equal(null, err);
        console.log('Se agregaron: ' + req.body.randomvalue + ' nuevos usuarios');
        for (newuser of result.ops) {
          var sql = "CALL datamodel.generarModel('" + newuser._id + "', '" + newuser.registro + "');";
          conn.query(sql, function(err, result) {
            if (err) throw err;
          });
          var sql = "CALL instinto.generarPuntaje('" + newuser._id + "');";
          conn.query(sql, function(err, result) {
            if (err) throw err;
          });
          sql = "CALL sentimientos.generarPuntaje('" + newuser._id + "');";
          conn.query(sql, function(err, result) {
            if (err) throw err;
          });
          sql = "CALL pensamientos.generarPuntaje('" + newuser._id + "');";
          conn.query(sql, function(err, result) {
            if (err) throw err;
          });
        }
        db.close();
      });
    });

  });

  res.redirect('/simulation');
});

router.post('/insert', function(req, res, next) {
  var item;
  var fecha_actual = new Date().toISOString();
  var fecha_nacimiento = new Date(req.body.nacimiento).toISOString();
  var userid;

  if (req.body.cuantos_hermanos == '') {
    item = {
      cedula: parseInt(req.body.cedula),
      genero: req.body.genero,
      nacimiento: fecha_nacimiento,
      edad: parseInt(req.body.edad),
      estado: req.body.estado,
      ciudad: req.body.ciudad,
      profesion: req.body.profesion,
      estado_civil: parseInt(req.body.estado_civil),
      trabaja: parseInt(req.body.trabaja),
      vivir_padres: parseInt(req.body.vivir_padres),
      tiene_hermanos: parseInt(req.body.tiene_hermanos),
      cuantos_hermanos: parseInt('0'),
      registro: fecha_actual
    };
  } else {
    item = {
      cedula: parseInt(req.body.cedula),
      genero: req.body.genero,
      nacimiento: fecha_nacimiento,
      edad: parseInt(req.body.edad),
      estado: req.body.estado,
      ciudad: req.body.ciudad,
      profesion: req.body.profesion,
      estado_civil: parseInt(req.body.estado_civil),
      trabaja: parseInt(req.body.trabaja),
      vivir_padres: parseInt(req.body.vivir_padres),
      tiene_hermanos: parseInt(req.body.tiene_hermanos),
      cuantos_hermanos: parseInt(req.body.cuantos_hermanos),
      registro: fecha_actual
    };
  }

  mongo.connect(url, function(err, db) {
    assert.equal(null, err);
    db.collection('userdata').insertOne(item, function(err, result) {
      userid = result.insertedId;
      assert.equal(null, err);
      var sql = "INSERT INTO pensamientos.usuarios(ID) VALUES ('" + userid + "');";
      conn.query(sql, function(err, result) {
        if (err) throw err;
      });
      var sql2 = "INSERT INTO sentimientos.usuarios(ID) VALUES ('" + userid + "');";
      conn.query(sql2, function(err2, result) {
        if (err2) throw err;
      });
      var sql3 = "INSERT INTO instinto.usuarios(ID) VALUES ('" + userid + "');";
      conn.query(sql3, function(err3, result) {
        if (err3) throw err;
      });
      console.log('User inserted manually');
      db.close();
      res.redirect('/sentimientos/' + userid + "/2");
    });
  });

});

router.get('/sentimientos/:user/:test', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.test);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "SELECT idpregunta, descripcion FROM sentimientos.preguntas WHERE idtipos = " + testnum + " ORDER BY idpregunta ASC;";
  conn.query(sql, function(err, result) {
    if (err) throw err;
    var sql2 = "SELECT nombre FROM sentimientos.tipos WHERE id = " + testnum;
    conn.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      res.render('sentimientos', {
        userid: user.slice(1, -1),
        id: test.slice(1, -1),
        tipo: result2[0].nombre,
        preguntas: result
      });
    });
  });
});


router.get('/pensamientos/:user/:test', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.test);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "SELECT idpregunta, descripcion FROM pensamientos.preguntas WHERE idtipos = " + testnum + " ORDER BY idpregunta ASC;";
  conn.query(sql, function(err, result) {
    if (err) throw err;
    var sql2 = "SELECT nombre FROM pensamientos.tipos WHERE id = " + testnum;
    conn.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      res.render('pensamientos', {
        userid: user.slice(1, -1),
        id: test.slice(1, -1),
        tipo: result2[0].nombre,
        preguntas: result
      });
    });
  });
});

router.get('/instinto/:user/:test', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.test);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "SELECT idpregunta, descripcion FROM instinto.preguntas WHERE idtipos = " + testnum + " ORDER BY idpregunta ASC;";
  conn.query(sql, function(err, result) {
    if (err) throw err;
    var sql2 = "SELECT nombre FROM instinto.tipos WHERE id = " + testnum;
    conn.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      res.render('instinto', {
        userid: user.slice(1, -1),
        id: test.slice(1, -1),
        tipo: result2[0].nombre,
        preguntas: result
      });
    });
  });
});

router.get('/resultados/:user', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var sql = "SELECT t.id, t.nombre, t.aviso, a.descripcion, ua.idusuario FROM pensamientos.tipos as t, pensamientos.analisis as a, pensamientos.usuarios as u, pensamientos.usuarios_has_analisis as ua WHERE t.id = a.idtipos AND a.idtipos = ua.idtipos AND a.idanalisis = ua.idanalisis AND u.ID = ua.idusuario AND u.ID = " + user + " ORDER BY t.id ASC;";
  conn.query(sql, function(err, result) {
    if (err) throw err;
    var sql2 = "SELECT t.id, t.nombre, t.aviso, a.descripcion, ua.idusuario FROM sentimientos.tipos as t, sentimientos.analisis as a, sentimientos.usuarios as u, sentimientos.usuarios_has_analisis as ua WHERE t.id = a.idtipos AND a.idtipos = ua.idtipos AND a.idanalisis = ua.idanalisis AND u.ID = ua.idusuario AND u.ID = " + user + " ORDER BY t.id ASC;";
    conn.query(sql2, function(err2, result2) {
      if (err2) throw err2;
      var sql3 = "SELECT t.id, t.nombre, t.aviso, a.descripcion, ua.idusuario FROM instinto.tipos as t, instinto.analisis as a, instinto.usuarios as u, instinto.usuarios_has_analisis as ua WHERE t.id = a.idtipos AND a.idtipos = ua.idtipos AND a.idanalisis = ua.idanalisis AND u.ID = ua.idusuario AND u.ID = " + user + " ORDER BY t.id ASC;";
      conn.query(sql3, function(err3, result3) {
        if (err3) throw err3;
        console.log(result);
        res.render('resultados', {
          pensamientos: result,
          sentimientos: result2,
          instinto: result3
        });
      });
    });
  });
});

router.post('/:user/:id/add/sentimientos', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.id);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 1 + "," + req.body.pregunta1 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 2 + "," + req.body.pregunta2 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 3 + "," + req.body.pregunta3 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 4 + "," + req.body.pregunta4 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 5 + "," + req.body.pregunta5 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 6 + "," + req.body.pregunta6 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 7 + "," + req.body.pregunta7 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 8 + "," + req.body.pregunta8 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 9 + "," + req.body.pregunta9 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 10 + "," + req.body.pregunta10 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 11 + "," + req.body.pregunta11 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 12 + "," + req.body.pregunta12 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 13 + "," + req.body.pregunta13 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 14 + "," + req.body.pregunta14 + ");";
  sql += " INSERT INTO sentimientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 15 + "," + req.body.pregunta15 + ");";

  conn.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Usuario agregado a resultados: Sentimientos en el tipo: " + testnum);
  });
  if (testnum + 1 == 5) {
    res.redirect('/pensamientos/' + user.slice(1, -1) + "/" + (testnum + 1));
  } else {
    res.redirect('/sentimientos/' + user.slice(1, -1) + "/" + (testnum + 1));
  }
});

router.post('/:user/:id/add/pensamientos', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.id);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 1 + "," + req.body.pregunta1 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 2 + "," + req.body.pregunta2 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 3 + "," + req.body.pregunta3 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 4 + "," + req.body.pregunta4 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 5 + "," + req.body.pregunta5 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 6 + "," + req.body.pregunta6 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 7 + "," + req.body.pregunta7 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 8 + "," + req.body.pregunta8 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 9 + "," + req.body.pregunta9 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 10 + "," + req.body.pregunta10 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 11 + "," + req.body.pregunta11 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 12 + "," + req.body.pregunta12 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 13 + "," + req.body.pregunta13 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 14 + "," + req.body.pregunta14 + ");";
  sql += " INSERT INTO pensamientos.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 15 + "," + req.body.pregunta15 + ");";

  conn.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Usuario agregado a resultados: Pensamientos en el tipo: " + testnum);
  });
  if (testnum + 1 == 8) {
    res.redirect('/instinto/' + user.slice(1, -1) + "/" + (testnum + 1));
  } else {
    res.redirect('/pensamientos/' + user.slice(1, -1) + "/" + (testnum + 1));
  }
});

router.post('/:user/:id/add/instinto', function(req, res, next) {
  var user = JSON.stringify(req.params.user);
  var test = JSON.stringify(req.params.id);
  var testnum = parseInt(test[1]);
  if (isNaN(testnum)) res.end("Tipo equivocado");

  var sql = "INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 1 + "," + req.body.pregunta1 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 2 + "," + req.body.pregunta2 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 3 + "," + req.body.pregunta3 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 4 + "," + req.body.pregunta4 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 5 + "," + req.body.pregunta5 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 6 + "," + req.body.pregunta6 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 7 + "," + req.body.pregunta7 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 8 + "," + req.body.pregunta8 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 9 + "," + req.body.pregunta9 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 10 + "," + req.body.pregunta10 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 11 + "," + req.body.pregunta11 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 12 + "," + req.body.pregunta12 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 13 + "," + req.body.pregunta13 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 14 + "," + req.body.pregunta14 + ");";
  sql += " INSERT INTO instinto.resultados(idusuario, idtipos, idpregunta, puntaje) VALUES (" + user + "," + testnum + "," + 15 + "," + req.body.pregunta15 + ");";

  conn.query(sql, function(err, result) {
    if (err) throw err;
    console.log("Usuario agregado a resultados: Instinto en el tipo: " + testnum);
  });
  if (testnum != 1 && testnum + 1 != 10) res.redirect('/instinto/' + user.slice(1, -1) + "/" + (testnum + 1));
  if (testnum + 1 == 10) res.redirect('/instinto/' + user.slice(1, -1) + "/1");
  if (testnum == 1) res.redirect('/resultados/' + user.slice(1, -1));
});

module.exports = router;