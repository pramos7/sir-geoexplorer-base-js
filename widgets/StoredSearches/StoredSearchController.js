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

/**
 * FormDef object description:
 *
 * FormDef = [ Condition [, Condition, ... ] ]
 *
 * Condition = {
 *
 *      local (boolean): Optional. If TRUE this filter won't be sent to the
 *          server. Useful for filters only needed in the GUI,
 *
 *      hidden (boolean): Optional. If TRUE the field will be hidden,
 *
 *      property (string): The layer property name to be queried,
 *
 *      label (string): Used in the GUI to display the property name,
 *
 *      filters (array): List of allowed comparisons. Allowed values are
 *          a subset of the comparisons defined in OpenLayers.Filter.Comparison.
 *          [ < | > | <= | >= | == | != ]
 *          (see: http://dev.openlayers.org/docs/files/OpenLayers/Filter/Comparison-js.html#OpenLayers.Filter.Comparison.type),
 *
 *      valueReader (object): Optional. An ExtJs Reader object used to restrict
 *          the filter's posible values. If present the GUI will draw a ComboBox
 *          and the filters option will be setted to '=',
 *
 *      value (string): Useful for hidden fields,
 *
 *      onChange (function): A callback called when a field is changing its
 *          value.
 * }
 *
 * QueryDef object description:
 *
 * QueryDef = [ Filter [, Filter, ...] ]
 *
 * Filter = {
 *
 *      property (string): The layer property name to be queried,
 *
 *      comparison (string): The filter the user selects,
 *
 *      value (string): Attribute where the user input will be stored
 * }
 *
 **/

Viewer.controller.StoredSearchController = Ext.extend(Viewer.controller.Controller, {

    formDef: null,

    queryDef: null,

    queryDefIndex: null,

    defaultFilters: [ '==', '!=', '<', '<=', '>', '>=' ],

    featureType: null,

    wfsServiceUrl: null,

    formFields: null,

    constructor: function(config) {

        Viewer.controller.StoredSearchController.superclass.constructor.call(this, config);

        this.addEvents({
            load: true,
            loadError: true
        });

        this.mapPanel = Viewer.getMapPanel();
        this.map = this.mapPanel.map;

        this.formDef = this.formDef || [];
        this.queryDef = this.queryDef || [];
        this.wfsServiceUrl = config.wfsServiceUrl;

        this.initQueryDef();
    },

    onAfterRender: function() {
    },

    onShow: function() {
        this.clearForm();
    },

    onHide: function() {
    },

    clearForm: function(){
        var key, formField;
        try {
            if(!!this.formFields){
                for (key in this.formFields) {
                    formField = this.formFields[key];
                    formField.setValue(null);
                    if(!!formField.store && formField.store.proxy) {
                        // We reload remote stores.
                        formField.store.load();
                    }
                }
            }
            
            if(!!this.formFilters){
                for (key in this.formFilters) {
                    formField = this.formFilters[key];
                    formField.setValue(this.defaultFilters[0]);
                    this.queryDefIndex[formField.name].comparison = formField.getValue();
                }
            }
            
            if(!!this.layer){
                this.layer.filter = null;
                this.layer.refresh({force: true});
            }
        } catch(e) {}
    },

    validateQuery: function() {
        return true;
    },

    initQueryDef: function() {
        this.queryDefIndex = {};
        for (var i=0, l=this.formDef.length; i<l; i++) {
            var condition = this.formDef[i];
            if (condition.local) continue;
            this.queryDefIndex[condition.property] = {
                property: condition.property,
                comparison: OpenLayers.Filter.Comparison.EQUAL_TO,
                value: ''
            };
            this.queryDef.push(this.queryDefIndex[condition.property]);
        }
    },

    doRequest: function(options) {

        try {

            options = options || {};
            options.wfsServiceUrl = options.wfsServiceUrl || this.wfsServiceUrl;
            options.featureType = options.featureType || this.featureType;

            var xmlQuery = new Viewer.plugins.XmlQueryAdapter()
                .parse(this.queryDef);

            if (!this.validateQuery()) {
                this.fireEvent('loadError', {
                    code: 400, // Bad request
                    message: 'Debe especificar algúna condición de búsqueda.'
                });
                return;
            }

            var protocol = new OpenLayers.Protocol.WFS({
                url: options.wfsServiceUrl,
                featureType: options.featureType,
                filter: xmlQuery
            });

            protocol.read({
                callback: function(response) {
                    if (response.priv.status == 200) {
                        this.fireEvent('load', response.features);
                    } else {
                        this.fireEvent('loadError', {
                            code: response.priv.status,
                            message: response.priv.statusText
                        });
                    }
                }.createDelegate(this)
            });

        } catch (e) {
            this.fireEvent('loadError', {
                code: 400, // Bad request
                message: e
            });
        }
    },

    createWPSJsonStore: function(options) {

        var createWPSRequest = function(featureType, attributeName, filter) {
            var data = {
                identifier: 'gs:Unique',
                dataInputs: [{
                    identifier: 'features',
                    reference: {
                        body: {
                            wfs: {
                                version: '1.1.0',
                                outputFormat: 'GML3',
                                featureType: featureType,
                                filter: filter,
                                sortBy: attributeName
                            }
                        },
                        method: 'POST',
                        mimeType: 'text/xml; subtype=wfs-collection/1.0',
                        href: 'http://geoserver/wfs',
                        xlink: 'http://www.w3.org/1999/xlink'
                    }
                },
                {
                    identifier: 'attribute',
                    data: {
                        literalData: {
                            value: attributeName
                        }
                    }
                }],
                responseForm: {
                    rawDataOutput: {
                        mimeType: 'application/json',
                        identifier: 'result'
                    }
                }
            };

            return new OpenLayers.Format.WPSExecute().write(data);
        };

        var featureType = 'feature:' + options.featureType || '';
        delete options.featureType;
        var attributeName = options.attributeName || '';
        delete options.attributeName;

        var url = this.wfsServiceUrl;

        var controller = this;
        return new Ext.data.JsonStore(Ext.apply({
            autoLoad: true,
            proxy: new Ext.data.HttpProxy({
                url: url,
                headers: {
                    'Content-Type': 'application/xml; charset=utf-8'
                }
            }),
            listeners: {
                beforeLoad: function(store, requestOptions) {
                    var filter = null;
                    if(!!options && !!options.dependsOn) {                        
                        filter = controller.createFilter(options.dependsOn);                                               
                    }
                    requestOptions.params = createWPSRequest(featureType, attributeName, filter);
                }
            },
            root: 'features',
            fields: [
                { name: 'id' },
                { name: 'text', mapping: 'properties.value' }
            ],
            scope: this
        }, options));
    },
    
    createFilter : function(fields) {
        var filter = null;
        if(Ext.isArray(fields)) {
            var filters = [];
            
            for(var i=0; i< fields.length; i++) {
                var fieldFilter = this.createFieldFilter(fields[i]);
                if(fieldFilter) {
                    filters.push(fieldFilter);
                }
            }
            if(filters.length==1) {
                filter = filters[0];
            } else if(filters.length>1) {
                filter = new OpenLayers.Filter.Logical({
                    filters: filters,
                    type: "&&"
                })
            }
        } else {
            filter = this.createFieldFilter(fields);
        }
        
        return filter;
    },
    
    createFieldFilter : function(field) {       
        if(!field || !this.formFields[field]) {
            return null;
        }
        
        var filter = null;        
        var filterValue = this.formFields[field].getValue();
        if(!!filterValue && filterValue != this.formFields[field].valueNotFoundText) {
            filter = new OpenLayers.Filter.Comparison({
                type: "==",
                property: field,
                value: filterValue
            });
        }
        
        return filter;
    }

});
