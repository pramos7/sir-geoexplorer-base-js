/**
 * Copyright (C) 2013
 *
 * This file is part of the project ohiggins
 *
 * This software is free software; you can redistribute it and/or modify it
 * under the terms of the GNU General Public License as published by the Free
 * Software Foundation; either version 2 of the License, or (at your option) any
 * later version.
 *
 * This software is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 *
 * You should have received a copy of the GNU General Public License along with
 * this library; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA
 *
 * As a special exception, if you link this library with other files to produce
 * an executable, this library does not by itself cause the resulting executable
 * to be covered by the GNU General Public License. This exception does not
 * however invalidate any other reasons why the executable file might be covered
 * by the GNU General Public License.
 *
 * Author: Antonio Hernández <ahernandez@emergya.com>
 */

Viewer.controller.ProyectosSEAStoredSearch = Ext.extend(Viewer.controller.StoredSearchController, {

    featureType: 'Proyectos_SEA',
    
    title: 'Proyectos de generación aprobados en SEIA por ámbito',

    constructor: function(config) {

        config = config || {};

        Viewer.controller.ProyectosSEAStoredSearch.superclass.constructor.call(this, config);

        this.AmbitoTerritorialStore = new Ext.data.ArrayStore({
            fields: [ 'id', 'text' ],
            data: [ [1, 'Nacional'], [2, 'Regional'], [3, 'Provincial'], [4, 'Comunal'] ]
        });

        this.RegionStore = this.createWPSJsonStore({
            featureType: this.featureType,
            attributeName: 'REGION'
        });

        this.ProvinciaStore = this.createWPSJsonStore({
            featureType: this.featureType,
            attributeName: 'PROVINCIA',
            dependsOn: "REGION"
        });

        this.ComunaStore = this.createWPSJsonStore({
            featureType: this.featureType,
            attributeName: 'COMUNA',
            dependsOn: ["PROVINCIA","REGION"]
        });

        this.formDef = [
            { local: true, property: 'AMBITO_TERRITORIAL', label: 'Ámbito Territorial',
                valueReader: this.AmbitoTerritorialStore, onChange: this.ambitoTerritorialHandler.createDelegate(this) },
            { property: 'REGION', label: 'Región', valueReader: this.RegionStore, onChange: this.onRegionChanged.createDelegate(this) },
            { property: 'PROVINCIA', label: 'Provincia', valueReader: this.ProvinciaStore, onChange: this.onProvinceChanged.createDelegate(this) },
            { property: 'COMUNA', label: 'Comuna', valueReader: this.ComunaStore }
        ];

        this.initQueryDef();
    },

    onAfterRender: function() {
        this.formFields['AMBITO_TERRITORIAL'].setValue();
        this.formFields['REGION'].setDisabled(true);
        this.formFields['PROVINCIA'].setDisabled(true);
        this.formFields['COMUNA'].setDisabled(true);
    },

    onShow: function() {
        Viewer.controller.ProyectosSEAStoredSearch.superclass.onShow.call(this);
    },

    onHide: function() {
        try {
            this.formFields['AMBITO_TERRITORIAL'].setValue();
            this.formFields['REGION'].setValue();
            this.formFields['PROVINCIA'].setValue();
            this.formFields['COMUNA'].setValue();
        } catch(e) {}
    },

    //validateQuery: function() {
    //},

    ambitoTerritorialHandler: function(widget, store, value, formFields) {
        formFields['REGION'].setDisabled(value < 1);
        formFields['PROVINCIA'].setDisabled(value < 2);
        formFields['COMUNA'].setDisabled(value < 3);
        if (value == 0) {
            formFields['REGION'].setValue(null);
            this.queryDefIndex['REGION'].value = null;
            formFields['PROVINCIA'].setValue(null);
            this.queryDefIndex['PROVINCIA'].value = null;
            formFields['COMUNA'].setValue(null);
            this.queryDefIndex['COMUNA'].value = null;
        } else if (value == 1) {
            formFields['PROVINCIA'].setValue(null);
            this.queryDefIndex['PROVINCIA'].value = null;
            formFields['COMUNA'].setValue(null);
            this.queryDefIndex['COMUNA'].value = null;
        } else if (value == 2) {
            formFields['COMUNA'].setValue(null);
            this.queryDefIndex['COMUNA'].value = null;
        }
    },

    onProvinceChanged: function() {
        this.formFields['COMUNA'].setValue(null);
        this.formFields['COMUNA'].store.load();
    },

    onRegionChanged: function() {
        this.formFields['PROVINCIA'].setValue(null);
        this.formFields['PROVINCIA'].store.load();
        this.formFields['COMUNA'].setValue(null);
        this.formFields['COMUNA'].store.load();
    }

});
