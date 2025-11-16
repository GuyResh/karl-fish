declare module 'leaflet.offline' {
  import * as L from 'leaflet';

  interface OfflineTileLayerOptions extends L.TileLayerOptions {
    subdomains?: string[];
  }

  interface OfflineControlOptions {
    position?: L.ControlPosition;
    text?: string;
    title?: string;
    confirmDownload?: (tileCount: number) => boolean;
  }

  namespace L {
    namespace TileLayer {
      function offline(urlTemplate: string, options?: OfflineTileLayerOptions): L.TileLayer;
    }

    namespace Control {
      interface OfflineOptions extends OfflineControlOptions {}
      
      class Offline extends Control {
        constructor(tileLayer: L.TileLayer, options?: OfflineOptions);
      }
    }

    namespace control {
      function offline(tileLayer: L.TileLayer, options?: L.Control.OfflineOptions): L.Control.Offline;
    }
  }
}
