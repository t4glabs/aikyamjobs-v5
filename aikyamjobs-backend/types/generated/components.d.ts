import type { Attribute, Schema } from '@strapi/strapi';

export interface ApplyChecklistItem extends Schema.Component {
  collectionName: 'components_apply_checklist_items';
  info: {
    description: 'One self-assessment statement shown as a checkbox on the gated application form.';
    displayName: 'Checklist Item';
  };
  attributes: {
    label: Attribute.String & Attribute.Required;
    required: Attribute.Boolean & Attribute.DefaultTo<false>;
    weight: Attribute.Integer &
      Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      > &
      Attribute.DefaultTo<1>;
  };
}

declare module '@strapi/types' {
  export module Shared {
    export interface Components {
      'apply.checklist-item': ApplyChecklistItem;
    }
  }
}
