import type { Schema, Struct } from '@strapi/strapi';

export interface ApplyChecklistItem extends Struct.ComponentSchema {
  collectionName: 'components_apply_checklist_items';
  info: {
    description: 'One self-assessment statement shown as a checkbox on the gated application form.';
    displayName: 'Checklist Item';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    required: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    weight: Schema.Attribute.Integer &
      Schema.Attribute.SetMinMax<
        {
          max: 10;
          min: 1;
        },
        number
      > &
      Schema.Attribute.DefaultTo<1>;
  };
}

declare module '@strapi/strapi' {
  export namespace Public {
    export interface ComponentSchemas {
      'apply.checklist-item': ApplyChecklistItem;
    }
  }
}
