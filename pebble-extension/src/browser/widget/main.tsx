import * as React from 'react';
import { TreeWidget, TreeProps, TreeModel, ContextMenuRenderer, CompositeTreeNode, TreeNode, NodeProps, TreeDecoration } from "@theia/core/lib/browser";
import { inject, postConstruct } from "inversify";
import { PebbleNode } from '../../classes/node';
import { PebbleCore } from '../core';
import { PebbleHome } from './home';
import { PebbleToolbar } from './toolbar';
import { PebbleItem } from './item';
import { DragController } from './drag';
import { PebbleTreeModel } from '../../classes/tree';

export type PebbleViewWidgetFactory = () => PebbleViewWidget;
export const PebbleViewWidgetFactory = Symbol('PebbleViewWidgetFactory');

export class PebbleViewWidget extends TreeWidget {
  constructor(
    @inject(PebbleCore) protected readonly core: PebbleCore,
    @inject(DragController) protected readonly drag: DragController,
    @inject(TreeProps) protected readonly treeProps: TreeProps,
    @inject(PebbleTreeModel) model: PebbleTreeModel,
    @inject(ContextMenuRenderer) protected readonly contextMenuRenderer: ContextMenuRenderer
  ) {
    super(treeProps, model, contextMenuRenderer);

    this.id = 'pebble-view';
    this.title.label = 'Servers';
    this.title.caption = 'Servers';
    this.title.iconClass = 'fa fa-plug';
    this.title.closable = true;
    this.addClass('pebble-view');
  }

  @postConstruct()
  protected init(): void {
    super.init();
    this.core.model = this.model as PebbleTreeModel;
  }

  protected createContainerAttributes(): React.HTMLAttributes<HTMLElement> {
    const attrs = super.createContainerAttributes();
    return {
      ...attrs,
      onDragEnter: event => this.drag.onDragEnter(this.model.root, event),
      onDragOver: event => this.drag.onDragOver(this.model.root, event),
      onDragLeave: event => this.drag.onDragLeave(this.model.root, event),
      onDrop: event => this.drag.onDrop(this.model.root, event)
    };
  }

  protected createNodeAttributes(node: TreeNode, props: NodeProps): React.Attributes & React.HTMLAttributes<HTMLElement> {
    const elementAttrs = super.createNodeAttributes(node, props);
    return {
      ...elementAttrs,
      draggable: PebbleNode.isCollection(node) || PebbleNode.isItem(node),
      onDragStart: event => this.drag.onDragStart(node, event),
      onDragEnter: event => this.drag.onDragEnter(node, event),
      onDragOver: event => this.drag.onDragOver(node, event),
      onDragLeave: event => this.drag.onDragLeave(node, event),
      onDrop: event => this.drag.onDrop(node, event),
      onDoubleClick: event => this.doubleClick(node, event, elementAttrs.onDoubleClick),
      onClick: event => this.click(node, event, elementAttrs.onClick),
      title: node.name,
    };
  }
  
  protected doubleClick(node: TreeNode, event: React.MouseEvent<HTMLElement>, defaultHandler?: (event: React.MouseEvent<HTMLElement>) => void): void {
    if (event.altKey && (PebbleNode.isConnection(node) || PebbleNode.isItem(node))) {
      event.stopPropagation();
      this.core.select(node);
      this.core.showPropertiesDialog(node.id);
    } else if (PebbleNode.isRestMethod(node)) {
      event.stopPropagation();
      this.core.select(node);
      this.core.openMethodFunctionDocument(node.id);
    } else {
      defaultHandler && defaultHandler(event);
    }
  }
  protected click(node: TreeNode, event: React.MouseEvent<HTMLElement>, defaultHandler?: (event: React.MouseEvent<HTMLElement>) => void): void {
    if (event.altKey && (PebbleNode.isConnection(node) || PebbleNode.isItem(node))) {
      event.stopPropagation();
    } else {
      defaultHandler && defaultHandler(event);
    }
  }
  
  protected isEmpty(model?: TreeModel): boolean {
    model = model || this.model;
    return !model.root || (model.root as CompositeTreeNode).children.length < 2;
  }

  protected getDecorations(node: TreeNode): TreeDecoration.Data[] {
    const decorations = super.getDecorations(node);
    if (PebbleNode.isRestMethod(node)) {
      decorations.push({ tooltip: node.restMethod.function.name });
      decorations.push({ tooltip: node.restMethod.function.src });
    }
    return decorations;
  }
  
  protected renderCaption(node: TreeNode, props: NodeProps): React.ReactNode {
    const tooltip = this.getDecorationData(node, 'tooltip').filter(tooltip => !!tooltip).join('\n');
    if (PebbleNode.is(node)) {
      if (PebbleNode.isToolbar(node)) {
        return this.isEmpty(this.model) ? <PebbleHome core={this.core} /> : <PebbleToolbar core={this.core} />;
      } else {
        return <PebbleItem tooltip={tooltip} core={this.core} node={node} />;
      }
    }
    console.error('unknown node:', node);
    return '···';
  }
}