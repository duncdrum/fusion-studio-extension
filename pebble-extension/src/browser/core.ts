import { injectable, inject } from "inversify";
import { PebbleNode, PebbleDocumentNode, PebbleCollectionNode, PebbleToolbarNode, PebbleLoadingNode, PebbleConnectionNode } from "../classes/node";
import { TreeModel, TreeNode, CompositeTreeNode, ConfirmDialog } from "@theia/core/lib/browser";
import { PEBBLE_RESOURCE_SCHEME } from "./resource";
import { PebbleDocument, PebbleCollection } from "../classes/item";
import { PebbleConnection } from "../classes/connection";
import { NewConnectionDialog } from "./new-connection-dialog";
import { CommandRegistry } from "@theia/core";
import { actionID } from "../classes/action";

@injectable()
export class PebbleCore {
  @inject(CommandRegistry) protected readonly commands?: CommandRegistry;
  
  public get selected(): boolean {
    return !!this._model && this._model.selectedNodes.length > 0;
  }
  public get node(): PebbleNode | undefined {
    if (this._model && this._model.selectedNodes.length > 0) {
      return this._model.selectedNodes[0] as any as PebbleNode;
    }
  }
  
  private _model?: TreeModel;
  public set model(model: TreeModel | undefined) {
    if (this._model != model) {
      this._model = model;
      this.createRoot();
    }
  }
  public get model(): TreeModel | undefined {
    return this._model;
  }

  // new
  refresh() {
    this._model && this._model.refresh();
  }

  isConnection(): boolean {
    return !!this._model && this._model.selectedNodes.length > 0 && PebbleNode.isConnection(this._model.selectedNodes[0]);
  }

  execute(action: string) {
    this.commands && this.commands.executeCommand(actionID(action));
  }

  // from widget
  
  public createRoot() {
    // const nodes = this.reconcileTreeState(roots);
    if (this._model) {
      this._model.root = {
        id: 'pebble-connections-view-root',
        name: 'Pebble Connections Root',
        visible: false,
        children: [],
        parent: undefined
      } as CompositeTreeNode;
      this.addToolbar(this._model.root as CompositeTreeNode);
    }
  }
  
  protected getName(id: string): string {
    return id.split('/').pop() || id;
  }
  
  public addNode(child: TreeNode, parent?: TreeNode): void {
    CompositeTreeNode.addChild(parent as CompositeTreeNode, child);
    this._model && this._model.refresh();
  }
  public addDocument(parent: TreeNode, connection: PebbleConnection, document: PebbleDocument): void {
    this.addNode({
      type: 'item',
      connection,
      collection: false,
      id: document.name,
      link: PEBBLE_RESOURCE_SCHEME + ':' + document.name,
      name: this.getName(document.name),
      parent: parent,
      selected: false,
    } as PebbleDocumentNode, parent);
  }
  public addCollection(parent: TreeNode, connection: PebbleConnection, collection: PebbleCollection): void {
    this.addNode({
      type: 'item',
      connection,
      collection: true,
      children: [],
      id: collection.name,
      link: PEBBLE_RESOURCE_SCHEME + ':' + collection.name,
      name: this.getName(collection.name),
      parent: parent as CompositeTreeNode,
      selected: false,
      expanded: false,
    } as PebbleCollectionNode, parent);
  }
  public addConnection(connection: PebbleConnection, parent?: TreeNode, expanded?: boolean): void {
    this.addNode({
      type: 'connection',
      children: [],
      expanded,
      id: connection.username + '-' + connection.server,
      name: connection.name,
      connection: connection,
      parent: parent as any,
      selected: false
    } as PebbleConnectionNode, parent);
  }
  public addToolbar(parent: CompositeTreeNode): void {
    this.addNode({
      type: 'toolbar',
      id: 'pebble-toolbar',
      name: 'Pebble Toolbar',
      parent: parent,
      selected: false,
    } as PebbleToolbarNode, parent);
  }
  public laod(node: TreeNode): void {
    this.addNode({
      type: 'loading',
    } as PebbleLoadingNode, node);
  }
  public unlaod(node: TreeNode): void {
    CompositeTreeNode.removeChild(node as CompositeTreeNode, (node as CompositeTreeNode).children[0]);
    this.refresh();
  }

  // functionalities
  
  public async deleteConnection(): Promise<void> {
    if (!this.selected || !this._model) {
      return;
    }
    if (this.node && PebbleNode.isConnection(this.node)) {
      const node = this.node as PebbleConnectionNode;
      const msg = document.createElement('p');
      msg.innerHTML = 'Are you sure you want to the connection: <strong>' + node.connection.name + '</strong>?<br/>' +
      'Server: <strong>' + node.connection.server + '</strong><br/>' +
      'Username: <strong>' + node.connection.username + '</strong>';
      const dialog = new ConfirmDialog({
        title: 'Delete connection',
        msg,
        cancel: 'Keep',
        ok: 'Delete'
      });
      const result = await dialog.open();
      if (result) {
        CompositeTreeNode.removeChild(this._model.root as CompositeTreeNode, node);
        this._model.refresh();
      } else {
        this._model.selectNode(node);
      }
    }
  }
  
  public async newConnection(): Promise<void> {
    if (!this._model) {
      return;
    }
    const dialog = new NewConnectionDialog({
      title: 'New connection',
      name: 'Localhost',
      server: 'http://localhost:8080',
      username: '',
      password: '',
    });
    const result = await dialog.open();
    if (result) {
      this.addConnection(result.connection, this._model.root, result.autoConnect);  
    }
  }
}