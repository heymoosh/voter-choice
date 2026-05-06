/* Google Maps Places API types for PlaceAutocompleteElement (New) */
declare namespace google.maps.places {
  class PlaceAutocompleteElement extends HTMLElement {
    constructor(opts?: {
      types?: string[];
      componentRestrictions?: { country: string | string[] };
    });
    addEventListener(
      type: "gmp-placeselect",
      listener: (e: PlaceAutocompletePlaceSelectEvent) => void,
    ): void;
    addEventListener(
      type: "gmp-select",
      listener: (e: PlaceAutocompletePlaceSelectEvent) => void,
    ): void;
    addEventListener(type: string, listener: EventListener): void;
  }

  interface PlaceAutocompletePlaceSelectEvent extends Event {
    place?: {
      formattedAddress?: string;
      formatted_address?: string;
      fetchFields?(opts: { fields: string[] }): Promise<unknown>;
    };
    placePrediction?: {
      toPlace(): {
        formattedAddress?: string;
        formatted_address?: string;
        fetchFields?(opts: { fields: string[] }): Promise<unknown>;
      };
    };
  }
}
