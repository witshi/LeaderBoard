const RED = "RED";
const BLACK = "BLACK";

class RBNode {
  constructor(key, player, color, nil) {
    this.key = key;
    this.player = player;
    this.color = color;
    this.left = nil;
    this.right = nil;
    this.parent = nil;
    this.x = 0;
    this.y = 0;
  }
}

export class RedBlackTree {
  constructor() {
    this.nil = {
      color: BLACK,
      left: null,
      right: null,
      parent: null,
      key: null,
      player: null,
      x: 0,
      y: 0,
    };
    this.nil.left = this.nil;
    this.nil.right = this.nil;
    this.nil.parent = this.nil;
    this.root = this.nil;
  }

  makeKey(score, scoreAchievedAt, username) {
    return { score, scoreAchievedAt, username };
  }

  compareKeys(a, b) {
    if (a.score !== b.score) {
      return a.score - b.score;
    }

    if (a.scoreAchievedAt !== b.scoreAchievedAt) {
      // Earlier timestamp has higher priority for ranking when score ties.
      return a.scoreAchievedAt < b.scoreAchievedAt ? 1 : -1;
    }

    if (a.username < b.username) {
      return -1;
    }
    if (a.username > b.username) {
      return 1;
    }
    return 0;
  }

  rotateLeft(x) {
    const y = x.right;
    x.right = y.left;
    if (y.left !== this.nil) {
      y.left.parent = x;
    }

    y.parent = x.parent;
    if (x.parent === this.nil) {
      this.root = y;
    } else if (x === x.parent.left) {
      x.parent.left = y;
    } else {
      x.parent.right = y;
    }

    y.left = x;
    x.parent = y;
  }

  rotateRight(y) {
    const x = y.left;
    y.left = x.right;
    if (x.right !== this.nil) {
      x.right.parent = y;
    }

    x.parent = y.parent;
    if (y.parent === this.nil) {
      this.root = x;
    } else if (y === y.parent.right) {
      y.parent.right = x;
    } else {
      y.parent.left = x;
    }

    x.right = y;
    y.parent = x;
  }

  insert(player) {
    const key = this.makeKey(player.score, player.scoreAchievedAt, player.username);
    const node = new RBNode(key, player, RED, this.nil);

    let parent = this.nil;
    let current = this.root;

    while (current !== this.nil) {
      parent = current;
      const cmp = this.compareKeys(node.key, current.key);
      if (cmp < 0) {
        current = current.left;
      } else if (cmp > 0) {
        current = current.right;
      } else {
        current.player = player;
        return current;
      }
    }

    node.parent = parent;
    if (parent === this.nil) {
      this.root = node;
    } else if (this.compareKeys(node.key, parent.key) < 0) {
      parent.left = node;
    } else {
      parent.right = node;
    }

    this.fixInsert(node);
    return node;
  }

  fixInsert(node) {
    let current = node;

    while (current.parent.color === RED) {
      if (current.parent === current.parent.parent.left) {
        const uncle = current.parent.parent.right;
        if (uncle.color === RED) {
          current.parent.color = BLACK;
          uncle.color = BLACK;
          current.parent.parent.color = RED;
          current = current.parent.parent;
        } else {
          if (current === current.parent.right) {
            current = current.parent;
            this.rotateLeft(current);
          }
          current.parent.color = BLACK;
          current.parent.parent.color = RED;
          this.rotateRight(current.parent.parent);
        }
      } else {
        const uncle = current.parent.parent.left;
        if (uncle.color === RED) {
          current.parent.color = BLACK;
          uncle.color = BLACK;
          current.parent.parent.color = RED;
          current = current.parent.parent;
        } else {
          if (current === current.parent.left) {
            current = current.parent;
            this.rotateRight(current);
          }
          current.parent.color = BLACK;
          current.parent.parent.color = RED;
          this.rotateLeft(current.parent.parent);
        }
      }
    }

    this.root.color = BLACK;
  }

  findNode(key) {
    let current = this.root;
    while (current !== this.nil) {
      const cmp = this.compareKeys(key, current.key);
      if (cmp === 0) {
        return current;
      }
      current = cmp < 0 ? current.left : current.right;
    }
    return this.nil;
  }

  transplant(u, v) {
    if (u.parent === this.nil) {
      this.root = v;
    } else if (u === u.parent.left) {
      u.parent.left = v;
    } else {
      u.parent.right = v;
    }
    v.parent = u.parent;
  }

  minimum(node) {
    let current = node;
    while (current.left !== this.nil) {
      current = current.left;
    }
    return current;
  }

  delete(key) {
    const z = this.findNode(key);
    if (z === this.nil) {
      return false;
    }

    let y = z;
    let yOriginalColor = y.color;
    let x;

    if (z.left === this.nil) {
      x = z.right;
      this.transplant(z, z.right);
    } else if (z.right === this.nil) {
      x = z.left;
      this.transplant(z, z.left);
    } else {
      y = this.minimum(z.right);
      yOriginalColor = y.color;
      x = y.right;
      if (y.parent === z) {
        x.parent = y;
      } else {
        this.transplant(y, y.right);
        y.right = z.right;
        y.right.parent = y;
      }
      this.transplant(z, y);
      y.left = z.left;
      y.left.parent = y;
      y.color = z.color;
    }

    if (yOriginalColor === BLACK) {
      this.fixDelete(x);
    }

    return true;
  }

  fixDelete(x) {
    let current = x;

    while (current !== this.root && current.color === BLACK) {
      if (current === current.parent.left) {
        let w = current.parent.right;
        if (w.color === RED) {
          w.color = BLACK;
          current.parent.color = RED;
          this.rotateLeft(current.parent);
          w = current.parent.right;
        }

        if (w.left.color === BLACK && w.right.color === BLACK) {
          w.color = RED;
          current = current.parent;
        } else {
          if (w.right.color === BLACK) {
            w.left.color = BLACK;
            w.color = RED;
            this.rotateRight(w);
            w = current.parent.right;
          }

          w.color = current.parent.color;
          current.parent.color = BLACK;
          w.right.color = BLACK;
          this.rotateLeft(current.parent);
          current = this.root;
        }
      } else {
        let w = current.parent.left;
        if (w.color === RED) {
          w.color = BLACK;
          current.parent.color = RED;
          this.rotateRight(current.parent);
          w = current.parent.left;
        }

        if (w.right.color === BLACK && w.left.color === BLACK) {
          w.color = RED;
          current = current.parent;
        } else {
          if (w.left.color === BLACK) {
            w.right.color = BLACK;
            w.color = RED;
            this.rotateLeft(w);
            w = current.parent.left;
          }

          w.color = current.parent.color;
          current.parent.color = BLACK;
          w.left.color = BLACK;
          this.rotateRight(current.parent);
          current = this.root;
        }
      }
    }

    current.color = BLACK;
  }

  inOrder(node = this.root, collector = []) {
    if (node === this.nil) {
      return collector;
    }

    this.inOrder(node.left, collector);
    collector.push(node.player);
    this.inOrder(node.right, collector);
    return collector;
  }

  reverseInOrder(node = this.root, collector = []) {
    if (node === this.nil) {
      return collector;
    }

    this.reverseInOrder(node.right, collector);
    collector.push(node.player);
    this.reverseInOrder(node.left, collector);
    return collector;
  }

  assignPositions(width = 1400, levelHeight = 100) {
    let order = 0;

    const traverse = (node, depth) => {
      if (node === this.nil) {
        return;
      }

      traverse(node.left, depth + 1);
      order += 1;
      node.x = (order / (Math.max(1, this.countNodes()) + 1)) * width;
      node.y = 70 + depth * levelHeight;
      traverse(node.right, depth + 1);
    };

    traverse(this.root, 0);
  }

  countNodes(node = this.root) {
    if (node === this.nil) {
      return 0;
    }
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }

  edges(node = this.root, collector = []) {
    if (node === this.nil) {
      return collector;
    }

    if (node.left !== this.nil) {
      collector.push([node, node.left]);
      this.edges(node.left, collector);
    }
    if (node.right !== this.nil) {
      collector.push([node, node.right]);
      this.edges(node.right, collector);
    }

    return collector;
  }

  nodes(node = this.root, collector = []) {
    if (node === this.nil) {
      return collector;
    }

    this.nodes(node.left, collector);
    collector.push(node);
    this.nodes(node.right, collector);
    return collector;
  }
}
